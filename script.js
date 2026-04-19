    (function () {
      "use strict";

      const NOW = new Date();
      NOW.setHours(0, 0, 0, 0);

      const state = {
        importedFiles: [],
        rawRecords: [],
        allRecords: [],
        filteredRecords: [],
        filesLoaded: [],
        nextImportId: 1,
        warnings: [],
        infoMessages: [],
        errors: [],
        sort: {
          key: "openedDate",
          direction: "desc"
        },
        charts: {
          status: null
        }
      };

      const elements = {
        fileInput: document.getElementById("fileInput"),
        selectFilesButton: document.getElementById("selectFilesButton"),
        clearDataButton: document.getElementById("clearDataButton"),
        clearFiltersButton: document.getElementById("clearFiltersButton"),
        exportCsvButton: document.getElementById("exportCsvButton"),
        dropzone: document.getElementById("dropzone"),
        messages: document.getElementById("messages"),
        fileCountLabel: document.getElementById("fileCountLabel"),
        rowCountLabel: document.getElementById("rowCountLabel"),
        fileImportList: document.getElementById("fileImportList"),
        debugAllRecordsTotal: document.getElementById("debugAllRecordsTotal"),
        debugAreaBreakdown: document.getElementById("debugAreaBreakdown"),
        debugFilteredTotal: document.getElementById("debugFilteredTotal"),
        alertList: document.getElementById("alertList"),
        windowSummaryList: document.getElementById("windowSummaryList"),
        summaryText: document.getElementById("summaryText"),
        tableBody: document.getElementById("tableBody"),
        tableSubtitle: document.getElementById("tableSubtitle"),
        lastUpdatedLabel: document.getElementById("lastUpdatedLabel"),
        metrics: {
          total: document.getElementById("metricTotal"),
          resolved: document.getElementById("metricResolved"),
          overdue: document.getElementById("metricOverdue"),
          onTime: document.getElementById("metricOnTime"),
          atRisk: document.getElementById("metricAtRisk"),
          sla: document.getElementById("metricSla")
        },
        filters: {
          area: document.getElementById("areaFilter"),
          client: document.getElementById("clientFilter"),
          status: document.getElementById("statusFilter"),
          search: document.getElementById("searchFilter"),
          startDate: document.getElementById("startDateFilter"),
          endDate: document.getElementById("endDateFilter")
        },
        chartCanvas: {
          status: document.getElementById("statusChart")
        },
        chartEmptyState: {
          status: document.getElementById("statusChartEmpty")
        },
        sortableHeaders: Array.from(document.querySelectorAll("[data-sort]"))
      };

      const FIELD_DETECTION = {
        ticket: {
          exact: ["ticket", "chamado", "ticket id", "issue key", "issuekey", "id", "protocolo", "numero ticket"],
          partial: ["ticket", "chamado", "issue key", "issue", "protocolo"],
          forbidden: ["cliente", "client", "customer", "empresa", "conta", "account", "status", "situacao", "sla", "prazo", "data", "date", "abertura", "limite", "venc", "resolu", "resolved", "produto", "squad", "sistema", "frente", "equipe", "area"],
          sampleType: "ticket"
        },
        linkTicket: {
          exact: ["ticket url", "url", "link", "issue url", "jira url"],
          partial: ["url", "link", "jira"],
          forbidden: ["cliente", "client", "customer", "empresa", "conta", "account", "status", "sla", "prazo", "data", "date", "area"],
          sampleType: "url"
        },
        cliente: {
          exact: ["cliente", "client", "customer", "nome cliente", "empresa", "empresa cliente", "conta", "account", "organization", "organizacao", "nome da empresa", "cliente final"],
          partial: ["cliente", "client", "customer", "empresa cliente", "empresa", "conta", "account", "organization", "organizacao", "cliente final"],
          forbidden: ["data", "date", "abertura", "limite", "due", "venc", "resolu", "resolved", "status", "situacao", "sla", "prazo", "area", "produto", "squad", "tipo", "sistema", "frente", "equipe", "url", "link", "ticket", "chamado", "issue", "key", "id", "responsavel", "responsÃ¡vel", "owner", "assignee", "solicitante", "reporter", "autor", "analista", "atendente"],
          sampleType: "client"
        },
        area: {
          exact: ["area", "produto", "squad", "tipo", "sistema", "frente", "equipe", "team", "grupo", "fila"],
          partial: ["area", "produto", "squad", "tipo", "sistema", "frente", "equipe", "team", "grupo", "fila"],
          forbidden: ["cliente", "client", "customer", "empresa", "conta", "account", "data", "date", "abertura", "limite", "due", "venc", "resolu", "resolved", "status", "situacao", "sla", "prazo", "url", "link", "ticket", "chamado", "issue", "key", "id"],
          sampleType: "area"
        },
        status: {
          exact: ["status", "situacao", "state"],
          partial: ["status", "situacao", "state"],
          forbidden: ["cliente", "client", "customer", "empresa", "conta", "account", "data", "date", "abertura", "limite", "due", "venc", "resolu", "resolved", "sla", "prazo", "url", "link", "ticket", "chamado", "issue", "key", "id", "area", "produto", "squad", "tipo", "sistema", "frente", "equipe"],
          sampleType: "status"
        },
        dataAbertura: {
          exact: ["data abertura", "data de abertura", "abertura", "created", "created at", "open date", "criado", "criado em"],
          partial: ["data abertura", "data de abertura", "abertura", "created", "open date", "criado"],
          forbidden: ["cliente", "client", "customer", "empresa", "conta", "account", "status", "sla", "prazo", "limite", "due", "venc", "resolu", "resolved", "url", "link", "ticket", "chamado", "issue", "key", "id", "area", "produto", "squad", "tipo", "sistema", "frente", "equipe"],
          sampleType: "date"
        },
        dataLimite: {
          exact: ["data limite", "due date", "duedate", "prazo", "prazo final", "data vencimento", "data de vencimento", "deadline"],
          partial: ["data limite", "due date", "duedate", "prazo", "venc", "deadline", "limite"],
          forbidden: ["cliente", "client", "customer", "empresa", "conta", "account", "status", "resolu", "resolved", "abertura", "created", "open", "url", "link", "ticket", "chamado", "issue", "key", "id", "area", "produto", "squad", "tipo", "sistema", "frente", "equipe"],
          sampleType: "date"
        },
        dataResolucao: {
          exact: ["data resolucao", "resolved", "resolved at", "resolution date", "data fechamento", "closed at", "resolvido em"],
          partial: ["resolu", "resolved", "resolution", "fech", "closed"],
          forbidden: ["cliente", "client", "customer", "empresa", "conta", "account", "status", "sla", "prazo", "abertura", "created", "open", "limite", "due", "venc", "url", "link", "ticket", "chamado", "issue", "key", "id", "area", "produto", "squad", "tipo", "sistema", "frente", "equipe"],
          sampleType: "date"
        },
        sla: {
          exact: ["sla", "prazo em dias", "dias sla", "tempo sla"],
          partial: ["sla", "prazo"],
          forbidden: ["cliente", "client", "customer", "empresa", "conta", "account", "status", "situacao", "abertura", "created", "open", "url", "link", "ticket", "chamado", "issue", "key", "id", "area", "produto", "squad", "sistema", "frente", "equipe"],
          sampleType: "sla"
        }
      };

      const FILE_AREA_STOPWORDS = new Set([
        "csv",
        "jira",
        "tickets",
        "ticket",
        "chamados",
        "chamado",
        "issues",
        "issue",
        "export",
        "exportacao",
        "exportacao",
        "relatorio",
        "relatorio",
        "report",
        "dados",
        "base",
        "planilha",
        "sla"
      ]);

      const OPERATIONAL_WINDOWS = [
        { keys: ["pluggy"], label: "Pluggy", threshold: 10 },
        { keys: ["s1nc", "sync"], label: "S1NC", threshold: 4 },
        { keys: ["winner", "w1nner"], label: "Winner", threshold: 1 }
      ];
      const FILE_AREA_OPTIONS = ["Pluggy", "S1NC", "Winner"];
      const FILE_AREA_OTHER_OPTION = "__other__";

      init();

      function init() {
        bindEvents();
        renderAll();
      }

      function bindEvents() {
        elements.selectFilesButton.addEventListener("click", function () {
          elements.fileInput.click();
        });

        elements.fileInput.addEventListener("change", function (event) {
          handleFiles(event.target.files);
          event.target.value = "";
        });

        elements.clearDataButton.addEventListener("click", clearAllData);
        elements.clearFiltersButton.addEventListener("click", resetFilters);
        elements.exportCsvButton.addEventListener("click", exportFilteredData);
        elements.fileImportList.addEventListener("input", handleFileAreaInput);
        elements.fileImportList.addEventListener("change", handleFileAreaInput);

        ["dragenter", "dragover"].forEach(function (eventName) {
          elements.dropzone.addEventListener(eventName, function (event) {
            event.preventDefault();
            elements.dropzone.classList.add("dragover");
          });
        });

        ["dragleave", "dragend", "drop"].forEach(function (eventName) {
          elements.dropzone.addEventListener(eventName, function (event) {
            event.preventDefault();
            if (eventName === "drop") {
              handleFiles(event.dataTransfer.files);
            }
            elements.dropzone.classList.remove("dragover");
          });
        });

        Object.values(elements.filters).forEach(function (input) {
          input.addEventListener("input", applyFiltersAndRender);
          input.addEventListener("change", applyFiltersAndRender);
        });

        elements.sortableHeaders.forEach(function (header) {
          header.addEventListener("click", function () {
            const key = header.getAttribute("data-sort");
            if (state.sort.key === key) {
              state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
            } else {
              state.sort.key = key;
              state.sort.direction = key === "ticket" ? "asc" : "desc";
            }
            renderTable();
            updateSortIndicators();
          });
        });
      }

      async function handleFiles(fileList) {
        const files = Array.from(fileList || []).filter(function (file) {
          return file && /\.csv$/i.test(file.name);
        });

        if (!files.length) {
          pushMessage("warn", "Nenhum arquivo CSV vÃ¡lido foi selecionado.");
          renderMessages();
          return;
        }

        clearTransientMessages();
        const localWarnings = [];
        const localErrors = [];
        const localInfos = [];

        for (const file of files) {
          try {
            const fileText = await readFileAsText(file);
            const parsed = parseCsvFile(file.name, fileText);
            localWarnings.push.apply(localWarnings, parsed.warnings);
            localInfos.push.apply(localInfos, parsed.diagnostics || []);
            const initialArea = sanitizeAreaValue(parsed.fileArea.finalArea);
            const importEntry = {
              id: "file-" + state.nextImportId,
              name: file.name,
              size: file.size,
              rows: parsed.records.length,
              detectedArea: parsed.fileArea.detectedArea,
              finalArea: initialArea,
              areaChoice: "",
              manualArea: "",
              areaSource: parsed.fileArea.source,
              requiresManualArea: parsed.fileArea.requiresManual,
              originalRecords: parsed.records.map(function (record) {
                return Object.assign({}, record);
              })
            };
            syncImportEntryAreaState(importEntry);
            state.nextImportId += 1;
            state.importedFiles.push(importEntry);
            localInfos.push("Arquivo " + file.name + ": " + parsed.records.length + " ticket(s) lido(s). Ãrea final do arquivo: " + safeDisplay(importEntry.finalArea, "pendente de ajuste") + ".");
          } catch (error) {
            localErrors.push("Falha ao processar " + file.name + ": " + (error && error.message ? error.message : "erro inesperado") + ".");
          }
        }

        if (state.importedFiles.length) {
          rebuildDatasetFromFiles();
          localInfos.push(state.rawRecords.length + " ticket(s) adicionados ao dataset consolidado.");
        }

        state.warnings = dedupeMessages(state.warnings.concat(localWarnings));
        state.errors = state.errors.concat(localErrors);
        state.infoMessages = state.infoMessages.concat(localInfos);
        applyFiltersAndRender();
      }

      function readFileAsText(file) {
        return new Promise(function (resolve, reject) {
          const reader = new FileReader();
          reader.onload = function () {
            resolve(String(reader.result || ""));
          };
          reader.onerror = function () {
            reject(new Error("nÃ£o foi possÃ­vel ler o arquivo"));
          };
          reader.readAsText(file, "utf-8");
        });
      }

      function handleFileAreaInput(event) {
        const target = event.target;
        if (!target.classList.contains("file-area-input") && !target.classList.contains("file-area-select")) {
          return;
        }

        const fileId = target.getAttribute("data-file-id");
        const importEntry = state.importedFiles.find(function (entry) {
          return entry.id === fileId;
        });

        if (!importEntry) {
          return;
        }

        if (target.classList.contains("file-area-select")) {
          importEntry.areaChoice = safeString(target.value);
          if (!importEntry.areaChoice) {
            importEntry.finalArea = "";
            importEntry.manualArea = "";
          } else if (importEntry.areaChoice !== FILE_AREA_OTHER_OPTION) {
            importEntry.manualArea = "";
          }
        }

        if (target.classList.contains("file-area-input")) {
          importEntry.areaChoice = FILE_AREA_OTHER_OPTION;
          importEntry.manualArea = sanitizeAreaValue(target.value);
        }

        importEntry.areaSource = "manual";
        syncImportEntryAreaState(importEntry);
        rebuildDatasetFromFiles();
        applyFiltersAndRender();
      }

function rebuildDatasetFromFiles() {
  refreshImportedFileAreaAssignments();
  const consolidatedRecords = [];

  state.importedFiles.forEach(function (entry) {
    const finalArea = sanitizeAreaValue(entry.finalArea);
    if (!finalArea) {
      return;
    }

    buildRecordsForImportEntry(entry).forEach(function (record) {
      consolidatedRecords.push(record);
    });
  });

  console.log(
    "CONSOLIDATED RECORDS:",
    consolidatedRecords.slice(0, 20).map(function (r) {
      return {
        ticket: r.ticket,
        area: r.area,
        cliente: r.cliente,
        status: r.status,
        sourceFile: r.sourceFile,
        sourceRow: r.sourceRow
      };
    })
  );

  state.filesLoaded = state.importedFiles.map(function (entry) {
    return {
      name: entry.name,
      size: entry.size,
      rows: entry.rows
    };
  });

  state.rawRecords = consolidatedRecords;
  state.allRecords = processRecords(consolidatedRecords);
}

      function refreshImportedFileAreaAssignments() {
        state.importedFiles.forEach(function (entry) {
          syncImportEntryAreaState(entry);
        });
      }

      function buildRecordsForImportEntry(entry) {
        const finalArea = sanitizeAreaValue(entry.finalArea);
        return (entry.originalRecords || []).map(function (record) {
          const recordArea = sanitizeAreaValue(record.area) || finalArea || "NÃƒÂ£o informada";
          return Object.assign({}, record, {
            area: recordArea,
            sourceImportId: entry.id,
            sourceAreaFinal: finalArea || recordArea
          });
        });
      }

      function syncImportEntryAreaState(entry) {
        const presetFromChoice = normalizePresetAreaValue(entry.areaChoice);
        const manualArea = sanitizeAreaValue(entry.manualArea);
        const currentFinalArea = sanitizeAreaValue(entry.finalArea);
        const presetFromFinalArea = normalizePresetAreaValue(currentFinalArea);

        if (presetFromChoice) {
          entry.areaChoice = presetFromChoice;
          entry.manualArea = "";
          entry.finalArea = presetFromChoice;
        } else if (entry.areaChoice === FILE_AREA_OTHER_OPTION) {
          entry.manualArea = manualArea;
          entry.finalArea = manualArea;
        } else if (presetFromFinalArea) {
          entry.areaChoice = presetFromFinalArea;
          entry.manualArea = "";
          entry.finalArea = presetFromFinalArea;
        } else if (currentFinalArea) {
          entry.areaChoice = FILE_AREA_OTHER_OPTION;
          entry.manualArea = currentFinalArea;
          entry.finalArea = currentFinalArea;
        } else {
          entry.areaChoice = "";
          entry.manualArea = "";
          entry.finalArea = "";
        }

        entry.requiresManualArea = !entry.finalArea;
      }

      function normalizePresetAreaValue(value) {
        const normalizedValue = normalizeComparable(value);
        const matchedOption = FILE_AREA_OPTIONS.find(function (option) {
          return normalizeComparable(option) === normalizedValue;
        });
        return matchedOption || "";
      }

      function parseCsvFile(fileName, rawText) {
        const normalizedText = String(rawText || "").replace(/\uFEFF/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        if (!normalizedText.trim()) {
          return {
            records: [],
            warnings: ["Arquivo " + fileName + " estÃ¡ vazio ou nÃ£o contÃ©m linhas Ãºteis."]
          };
        }

        const csvParsing = parseCsvRowsWithLibrary(fileName, normalizedText);
        const rows = csvParsing.rows.filter(function (row) {
          return row.some(function (cell) {
            return String(cell || "").trim() !== "";
          });
        });

        if (rows.length < 2) {
          return {
            records: [],
            warnings: ["Arquivo " + fileName + " nÃ£o possui cabeÃ§alho e linhas de dados suficientes."]
          };
        }

        const headerRow = rows[0].map(function (header) {
          return String(header || "").trim();
        });
        const dataRows = rows.slice(1);
        const schemaMapping = mapHeaders(headerRow, dataRows, fileName);
        const headerMap = schemaMapping.headerMap;
        const fileArea = detectFileArea(headerRow, dataRows, headerMap, fileName);
        const records = [];
        const warnings = csvParsing.warnings.concat(schemaMapping.warnings);
        const diagnostics = schemaMapping.diagnostics.slice();

        if (
          typeof headerMap.ticket === "undefined" &&
          typeof headerMap.cliente === "undefined" &&
          typeof headerMap.dataAbertura === "undefined"
        ) {
          warnings.push("Arquivo " + fileName + " possui cabeÃ§alhos pouco reconhecÃ­veis. O sistema tentou inferir as colunas automaticamente.");
        }

        for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
          const row = rows[rowIndex];
          const normalizedRow = headerRow.map(function (_, columnIndex) {
            return safeString(row[columnIndex]);
          });
          const normalizedRecord = buildNormalizedSchemaRow(normalizedRow, headerMap, fileArea.finalArea);

          if (isRecordEffectivelyEmpty(normalizedRecord)) {
            continue;
          }

          records.push(Object.assign({
            sourceFile: fileName,
            sourceRow: rowIndex + 1
          }, normalizedRecord));
        }

        if (!records.length) {
          warnings.push("Arquivo " + fileName + " nÃ£o gerou tickets vÃ¡lidos apÃ³s ignorar linhas vazias.");
        }

        if (fileArea.source === "file") {
          warnings.push("Arquivo " + fileName + " nÃ£o possui coluna Ãrea/equivalente; a Ã¡rea foi preenchida com o nome do arquivo.");
        }

        if (fileArea.requiresManual) {
          warnings.push("Arquivo " + fileName + " precisa de ajuste manual da Ã¡rea antes da consolidaÃ§Ã£o completa.");
        }

        return {
          records: records,
          warnings: warnings,
          diagnostics: diagnostics,
          fileArea: fileArea
        };
      }

      function parseCsvRowsWithLibrary(fileName, text) {
        const parser = window.Papa;
        if (!parser || typeof parser.parse !== "function") {
          return {
            rows: parseCsvRowsFallback(text, detectDelimiterFallback(text)),
            warnings: ["Arquivo " + fileName + ": Papa Parse nÃ£o foi carregado; o sistema usou o parser de contingÃªncia."]
          };
        }

        const result = parser.parse(text, {
          delimiter: "",
          skipEmptyLines: "greedy"
        });
        const rows = Array.isArray(result.data) ? result.data.map(function (row) {
          return Array.isArray(row) ? row : [row];
        }) : [];
        const warnings = (result.errors || []).filter(function (error) {
          return error && error.code !== "UndetectableDelimiter";
        }).map(function (error) {
          const rowLabel = typeof error.row === "number" ? " linha " + (error.row + 1) : "";
          return "Arquivo " + fileName + ":" + rowLabel + " " + safeDisplay(error.message, "erro de leitura no CSV") + ".";
        });

        if (!rows.length) {
          return {
            rows: parseCsvRowsFallback(text, detectDelimiterFallback(text)),
            warnings: warnings.concat(["Arquivo " + fileName + ": Papa Parse nÃ£o identificou linhas vÃ¡lidas; o sistema usou o parser de contingÃªncia."])
          };
        }

        return {
          rows: rows,
          warnings: warnings
        };
      }

      function detectDelimiterFallback(text) {
        const sampleLines = String(text || "").split("\n").slice(0, 8);
        let semicolonScore = 0;
        let commaScore = 0;

        sampleLines.forEach(function (line) {
          const safeLine = String(line || "");
          semicolonScore += (safeLine.match(/;/g) || []).length;
          commaScore += (safeLine.match(/,/g) || []).length;
        });

        return semicolonScore > commaScore ? ";" : ",";
      }

      function parseCsvRowsFallback(text, delimiter) {
        const rows = [];
        let currentCell = "";
        let currentRow = [];
        let insideQuotes = false;

        for (let index = 0; index < text.length; index += 1) {
          const char = text[index];
          const nextChar = text[index + 1];

          if (char === "\"") {
            if (insideQuotes && nextChar === "\"") {
              currentCell += "\"";
              index += 1;
            } else {
              insideQuotes = !insideQuotes;
            }
            continue;
          }

          if (char === delimiter && !insideQuotes) {
            currentRow.push(currentCell);
            currentCell = "";
            continue;
          }

          if (char === "\n" && !insideQuotes) {
            currentRow.push(currentCell);
            rows.push(currentRow);
            currentCell = "";
            currentRow = [];
            continue;
          }

          currentCell += char;
        }

        if (currentCell !== "" || currentRow.length) {
          currentRow.push(currentCell);
          rows.push(currentRow);
        }

        return rows;
      }

      function mapHeaders(headers, dataRows, fileName) {
        const usedIndexes = new Set();
        const headerMap = {};

        headerMap.ticket = findColumnIndexByRules(headers, dataRows, FIELD_DETECTION.ticket, usedIndexes);
        registerHeaderIndex(headerMap.ticket, usedIndexes);

        headerMap.linkTicket = findColumnIndexByRules(headers, dataRows, FIELD_DETECTION.linkTicket, usedIndexes);
        registerHeaderIndex(headerMap.linkTicket, usedIndexes);

        headerMap.cliente = findColumnIndexByRules(headers, dataRows, FIELD_DETECTION.cliente, usedIndexes);
        registerHeaderIndex(headerMap.cliente, usedIndexes);

        headerMap.area = findAreaHeaderIndex(headers, dataRows, usedIndexes);
        registerHeaderIndex(headerMap.area, usedIndexes);

        headerMap.status = findColumnIndexByRules(headers, dataRows, FIELD_DETECTION.status, usedIndexes);
        registerHeaderIndex(headerMap.status, usedIndexes);

        headerMap.dataAbertura = findColumnIndexByRules(headers, dataRows, FIELD_DETECTION.dataAbertura, usedIndexes);
        registerHeaderIndex(headerMap.dataAbertura, usedIndexes);

        headerMap.dataLimite = findColumnIndexByRules(headers, dataRows, FIELD_DETECTION.dataLimite, usedIndexes);
        registerHeaderIndex(headerMap.dataLimite, usedIndexes);

        headerMap.dataResolucao = findColumnIndexByRules(headers, dataRows, FIELD_DETECTION.dataResolucao, usedIndexes);
        registerHeaderIndex(headerMap.dataResolucao, usedIndexes);

        headerMap.sla = findColumnIndexByRules(headers, dataRows, FIELD_DETECTION.sla, usedIndexes);

        return {
          headerMap: headerMap,
          warnings: [],
          diagnostics: buildSchemaDiagnostics(fileName, headers, headerMap)
        };
      }

      function registerHeaderIndex(index, usedIndexes) {
        if (typeof index === "number") {
          usedIndexes.add(index);
        }
      }

      function findColumnIndexByRules(headers, dataRows, rules, usedIndexes) {
        const normalizedHeaders = headers.map(normalizeKey);
        const candidates = normalizedHeaders.map(function (header, index) {
          if (usedIndexes && usedIndexes.has(index)) {
            return null;
          }

          const matchScore = getHeaderMatchScore(header, rules);
          if (matchScore <= 0) {
            return null;
          }

          if (containsForbiddenTerm(header, rules.forbidden)) {
            return null;
          }

          const sample = analyzeColumnValues(dataRows, index);
          if (!columnPassesSampleType(sample, rules.sampleType)) {
            return null;
          }

          return {
            index: index,
            score: matchScore + getSampleScore(sample, rules.sampleType)
          };
        }).filter(Boolean);

        if (!candidates.length) {
          return undefined;
        }

        candidates.sort(function (a, b) {
          if (b.score === a.score) {
            return a.index - b.index;
          }
          return b.score - a.score;
        });

        return candidates[0].index;
      }

      function getHeaderMatchScore(header, rules) {
        const exactMatch = (rules.exact || []).find(function (alias) {
          return header === normalizeKey(alias);
        });

        if (exactMatch) {
          return 400 + normalizeKey(exactMatch).length;
        }

        const partialMatch = (rules.partial || []).find(function (alias) {
          return header.includes(normalizeKey(alias));
        });

        if (partialMatch) {
          return 200 + normalizeKey(partialMatch).length;
        }

        return 0;
      }

      function containsForbiddenTerm(header, forbiddenTerms) {
        return (forbiddenTerms || []).some(function (term) {
          return header.includes(normalizeKey(term));
        });
      }

      function analyzeColumnValues(dataRows, index) {
        const values = dataRows.map(function (row) {
          return safeString(row[index]);
        }).filter(Boolean).slice(0, 25);

        if (!values.length) {
          return {
            count: 0,
            dateRatio: 0,
            urlRatio: 0,
            numericRatio: 0
          };
        }

        let dateCount = 0;
        let urlCount = 0;
        let numericCount = 0;

        values.forEach(function (value) {
          if (isLikelyDateValue(value)) {
            dateCount += 1;
          }
          if (isLikelyUrlValue(value)) {
            urlCount += 1;
          }
          if (isLikelyNumericValue(value)) {
            numericCount += 1;
          }
        });

        return {
          count: values.length,
          dateRatio: dateCount / values.length,
          urlRatio: urlCount / values.length,
          numericRatio: numericCount / values.length
        };
      }

      function columnPassesSampleType(sample, sampleType) {
        if (!sample.count) {
          return true;
        }

        switch (sampleType) {
          case "date":
            return sample.dateRatio >= 0.5;
          case "url":
            return sample.urlRatio >= 0.5;
          case "client":
            return sample.dateRatio < 0.25 && sample.urlRatio < 0.2;
          case "area":
            return sample.dateRatio < 0.25 && sample.urlRatio < 0.2;
          case "status":
            return sample.dateRatio < 0.2 && sample.urlRatio < 0.2;
          case "ticket":
            return sample.dateRatio < 0.2;
          case "sla":
            return sample.urlRatio < 0.15 && sample.dateRatio < 0.6;
          default:
            return true;
        }
      }

      function getSampleScore(sample, sampleType) {
        if (!sample.count) {
          return 0;
        }

        switch (sampleType) {
          case "date":
            return Math.round(sample.dateRatio * 100);
          case "url":
            return Math.round(sample.urlRatio * 100);
          case "client":
          case "area":
          case "status":
          case "ticket":
            return Math.round((1 - sample.dateRatio - sample.urlRatio) * 50);
          case "sla":
            return Math.round((sample.numericRatio + (1 - sample.urlRatio)) * 20);
          default:
            return 0;
        }
      }

      function findAreaHeaderIndex(headers, dataRows, usedIndexes) {
        const normalizedHeaders = headers.map(normalizeKey);
        const exactIndex = normalizedHeaders.findIndex(function (header) {
          return header === "area" || header === "rea";
        });

        if (exactIndex >= 0 && !(usedIndexes && usedIndexes.has(exactIndex))) {
          return exactIndex;
        }

        return findColumnIndexByRules(headers, dataRows, FIELD_DETECTION.area, usedIndexes);
      }

      function buildSchemaDiagnostics(fileName, headers, headerMap) {
        return [
          buildFieldDiagnostic(fileName, "Ticket", headers, headerMap.ticket),
          buildFieldDiagnostic(fileName, "Link do ticket", headers, headerMap.linkTicket),
          buildFieldDiagnostic(fileName, "Cliente", headers, headerMap.cliente),
          buildAreaDiagnostic(fileName, headers, headerMap.area),
          buildFieldDiagnostic(fileName, "Data de abertura", headers, headerMap.dataAbertura),
          buildFieldDiagnostic(fileName, "Data limite", headers, headerMap.dataLimite),
          buildFieldDiagnostic(fileName, "SLA", headers, headerMap.sla),
          buildFieldDiagnostic(fileName, "Status", headers, headerMap.status),
          buildFieldDiagnostic(fileName, "Data de resoluÃ§Ã£o", headers, headerMap.dataResolucao)
        ].filter(Boolean);
      }

      function buildFieldDiagnostic(fileName, label, headers, index) {
        if (typeof index === "number") {
          return "Arquivo " + fileName + ": " + label + " <- coluna '" + safeDisplay(headers[index], "Sem nome") + "'.";
        }
        return "Arquivo " + fileName + ": " + label + " <- nÃ£o identificada.";
      }

      function buildAreaDiagnostic(fileName, headers, index) {
        if (typeof index === "number") {
          return "Arquivo " + fileName + ": Ãrea <- coluna '" + safeDisplay(headers[index], "Sem nome") + "'.";
        }
        return "Arquivo " + fileName + ": Ãrea <- fallback do nome do arquivo ('" + safeDisplay(deriveAreaFromFileName(fileName), "NÃ£o informada") + "').";
      }

      function detectFileArea(headers, dataRows, headerMap, fileName) {
        if (typeof headerMap.area === "number") {
          return {
            detectedArea: "Definida por linha",
            finalArea: "Definida por linha",
            source: "column",
            requiresManual: false
          };
        }

        const fileArea = deriveAreaFromFileName(fileName);
        if (fileArea) {
          return {
            detectedArea: fileArea,
            finalArea: fileArea,
            source: "file",
            requiresManual: false
          };
        }

        return {
          detectedArea: "",
          finalArea: "",
          source: "manual",
          requiresManual: true
        };
      }

      function buildNormalizedSchemaRow(row, headerMap, fileAreaValue) {
        const linkTicketValue = normalizeUrl(getFieldValue(row, headerMap.linkTicket));

        return {
          ticket: resolveTicketValue(row, headerMap, linkTicketValue),
          cliente: getFieldValue(row, headerMap.cliente) || "NÃ£o informado",
          area: sanitizeAreaValue(getFieldValue(row, headerMap.area)) || sanitizeAreaValue(fileAreaValue) || "NÃ£o informada",
          dataAbertura: getFieldValue(row, headerMap.dataAbertura),
          dataLimite: getFieldValue(row, headerMap.dataLimite),
          sla: getFieldValue(row, headerMap.sla),
          status: getFieldValue(row, headerMap.status) || "NÃ£o informado",
          dataResolucao: getFieldValue(row, headerMap.dataResolucao),
          linkTicket: linkTicketValue
        };
      }

      function getFieldValue(row, index) {
        if (typeof index !== "number") {
          return "";
        }
        return safeString(row[index]);
      }

      function resolveTicketValue(row, headerMap, linkTicketValue) {
        const mappedTicket = getFieldValue(row, headerMap.ticket);
        if (mappedTicket) {
          const normalizedUrl = normalizeUrl(mappedTicket);
          if (normalizedUrl) {
            return extractTicketIdFromLink(normalizedUrl) || normalizedUrl;
          }
          return mappedTicket;
        }

        if (linkTicketValue) {
          return extractTicketIdFromLink(linkTicketValue) || linkTicketValue;
        }

        return "Sem identificador";
      }

      function deriveAreaFromFileName(fileName) {
        const safeFileName = safeString(fileName);
        if (!safeFileName) {
          return "";
        }

        const baseName = safeFileName.split(/[\\/]/).pop().replace(/\.csv$/i, "").trim();
        if (!baseName) {
          return "";
        }

        if (baseName.includes(" - ")) {
          const parts = baseName.split(" - ");
          return sanitizeAreaValue(parts[parts.length - 1]);
        }

        return sanitizeAreaValue(baseName);
      }

      function sanitizeAreaValue(value) {
        const text = safeString(value);
        if (!text) {
          return "";
        }

        return text
          .replace(/\.[^.]+$/, "")
          .replace(/\s+/g, " ")
          .trim();
      }

      function describeAreaSource(source) {
        switch (source) {
          case "column":
            return "coluna do CSV";
          case "file":
            return "nome do arquivo";
          case "manual":
            return "ajuste manual";
          default:
            return "nÃ£o identificado";
        }
      }

      function extractTicketIdFromLink(url) {
        const safeUrl = safeString(url);
        if (!safeUrl) {
          return "";
        }

        const jiraKeyMatch = safeUrl.match(/([A-Z][A-Z0-9]+-\d+)/);
        if (jiraKeyMatch) {
          return jiraKeyMatch[1];
        }

        const trailingPart = safeUrl.split("/").filter(Boolean).pop();
        return trailingPart || "";
      }

      function isLikelyDateValue(value) {
        const text = safeString(value);
        if (!text) {
          return false;
        }
        if (parseBrazilianDate(text).date) {
          return true;
        }
        return /^\d{4}-\d{2}-\d{2}/.test(text);
      }

      function isLikelyUrlValue(value) {
        return /^https?:\/\//i.test(safeString(value));
      }

      function isLikelyNumericValue(value) {
        return /^-?\d+(?:[.,]\d+)?$/.test(safeString(value));
      }

      function isRecordEffectivelyEmpty(record) {
        return [record.ticket, record.cliente, record.area, record.status, record.dataAbertura, record.dataLimite, record.dataResolucao, record.sla, record.linkTicket]
          .every(function (value) {
            return safeString(value) === "";
          });
      }

      function processRecords(records) {
        const warnings = [];
        const processed = records.map(function (record, index) {
          const openedDateResult = parseBrazilianDate(record.dataAbertura);
          const dueDateResult = parseBrazilianDate(record.dataLimite);
          const resolvedDateResult = parseBrazilianDate(record.dataResolucao);
          const statusDisplay = safeDisplay(record.status, "NÃ£o informado");
          const clientDisplay = safeDisplay(record.cliente, "NÃ£o informado");
          const areaDisplay = safeDisplay(record.area || record.sourceAreaFinal, "NÃ£o informada");
          const ticket = safeDisplay(record.ticket, "Sem identificador");
          const ticketUrl = normalizeUrl(record.linkTicket);
          const businessDaysToResolution = openedDateResult.date && resolvedDateResult.date
            ? businessDaysBetween(openedDateResult.date, resolvedDateResult.date)
            : null;
          const businessDaysUntilDue = !resolvedDateResult.date && dueDateResult.date
            ? businessDaysBetween(NOW, dueDateResult.date)
            : null;
          const parsed = buildSlaState({
            dueDate: dueDateResult.date,
            resolvedDate: resolvedDateResult.date,
            businessDaysToResolution: businessDaysToResolution
          });
          const operational = buildOperationalState({
            areaDisplay: areaDisplay,
            isResolved: Boolean(resolvedDateResult.date),
            dueDate: dueDateResult.date,
            businessDaysUntilDue: businessDaysUntilDue
          });

          if (record.dataAbertura && !openedDateResult.date) {
            warnings.push("Linha " + record.sourceRow + " do arquivo " + record.sourceFile + ": data de abertura invÃ¡lida (" + record.dataAbertura + ").");
          }

          if (record.dataLimite && !dueDateResult.date) {
            warnings.push("Linha " + record.sourceRow + " do arquivo " + record.sourceFile + ": data limite invÃ¡lida (" + record.dataLimite + ").");
          }

          if (record.dataResolucao && !resolvedDateResult.date) {
            warnings.push("Linha " + record.sourceRow + " do arquivo " + record.sourceFile + ": data de resoluÃ§Ã£o invÃ¡lida (" + record.dataResolucao + ").");
          }

          return {
            id: record.sourceFile + "::" + record.sourceRow + "::" + index,
            sourceFile: record.sourceFile,
            sourceRow: record.sourceRow,
            area: safeDisplay(record.area, areaDisplay),
            cliente: clientDisplay,
            ticket: ticket,
            ticketUrl: ticketUrl,
            dataAbertura: safeDisplay(record.dataAbertura, ""),
            dataLimite: safeDisplay(record.dataLimite, ""),
            sla: safeDisplay(record.sla, ""),
            status: statusDisplay,
            dataResolucao: safeDisplay(record.dataResolucao, ""),
            clientDisplay: clientDisplay,
            clientKey: normalizeComparable(clientDisplay),
            areaValue: safeDisplay(record.area, areaDisplay),
            areaDisplay: areaDisplay,
            areaKey: normalizeComparable(safeDisplay(record.area, areaDisplay)),
            statusDisplay: statusDisplay,
            statusKey: normalizeComparable(statusDisplay),
            openedDate: openedDateResult.date,
            openedDateDisplay: formatDate(openedDateResult.date) || safeDisplay(record.dataAbertura, "NÃ£o informada"),
            dueDate: dueDateResult.date,
            dueDateDisplay: formatDate(dueDateResult.date) || safeDisplay(record.dataLimite, "NÃ£o informada"),
            resolvedDate: resolvedDateResult.date,
            resolvedDateDisplay: formatDate(resolvedDateResult.date) || safeDisplay(record.dataResolucao, "Em aberto"),
            slaOriginalDisplay: safeDisplay(record.sla, "NÃ£o informado"),
            slaCategory: parsed.slaCategory,
            slaBadgeClass: parsed.slaBadgeClass,
            lifecycleStatus: parsed.lifecycleStatus,
            isResolved: Boolean(resolvedDateResult.date),
            isOverdue: parsed.isOverdue,
            isDueSoon: parsed.isDueSoon,
            isWithinSla: parsed.isWithinSla,
            businessDaysDelta: parsed.businessDaysDelta,
            businessDaysUntilDue: businessDaysUntilDue,
            daysIndicatorValue: parsed.daysIndicatorValue,
            daysIndicatorDisplay: parsed.daysIndicatorDisplay,
            businessDaysToResolution: parsed.businessDaysToResolution,
            operationalAreaLabel: operational.areaLabel,
            operationalWindowThreshold: operational.threshold,
            operationalClassification: operational.classification,
            operationalBadgeClass: operational.badgeClass,
            operationalPriority: operational.priority,
            withinOperationalWindow: operational.withinWindow,
            searchBlob: normalizeComparable([
              ticket,
              clientDisplay,
              areaDisplay,
              statusDisplay,
              safeDisplay(record.sla, "")
            ].join(" ")),
            sortOpenedDate: openedDateResult.date ? openedDateResult.date.getTime() : -Infinity,
            sortDueDate: dueDateResult.date ? dueDateResult.date.getTime() : -Infinity,
            sortResolvedDate: resolvedDateResult.date ? resolvedDateResult.date.getTime() : -Infinity
          };
        });

        state.warnings = dedupeMessages(state.warnings.concat(warnings));
        return processed;
      }

      function buildSlaState(args) {
        const dueDate = args.dueDate || null;
        const resolvedDate = args.resolvedDate || null;
        const businessDaysToResolution = typeof args.businessDaysToResolution === "number"
          ? args.businessDaysToResolution
          : null;

        if (!dueDate) {
          return {
            slaCategory: resolvedDate ? "Resolvido sem data limite" : "Sem data limite",
            slaBadgeClass: "info",
            lifecycleStatus: resolvedDate ? "resolvido" : "em andamento",
            isOverdue: false,
            isDueSoon: false,
            isWithinSla: false,
            businessDaysDelta: null,
            daysIndicatorValue: Number.POSITIVE_INFINITY,
            daysIndicatorDisplay: "Sem data limite",
            businessDaysToResolution: businessDaysToResolution
          };
        }

        if (resolvedDate) {
          const difference = businessDaysBetween(dueDate, resolvedDate);
          const resolvedWithinSla = difference <= 0;

          if (resolvedWithinSla) {
            return {
              slaCategory: "Resolvido no prazo",
              slaBadgeClass: "success",
              lifecycleStatus: "resolvido",
              isOverdue: false,
              isDueSoon: false,
              isWithinSla: true,
              businessDaysDelta: Math.abs(difference),
              daysIndicatorValue: Math.abs(difference),
              daysIndicatorDisplay: difference === 0 ? "Resolvido no prazo" : Math.abs(difference) + " dia(s) Ãºteis antes/no prazo",
              businessDaysToResolution: businessDaysToResolution
            };
          }

          return {
            slaCategory: "Resolvido atrasado",
            slaBadgeClass: "danger",
            lifecycleStatus: "resolvido",
            isOverdue: true,
            isDueSoon: false,
            isWithinSla: false,
            businessDaysDelta: difference,
            daysIndicatorValue: difference,
            daysIndicatorDisplay: difference + " dia(s) Ãºteis de atraso",
            businessDaysToResolution: businessDaysToResolution
          };
        }

        const daysUntilDue = businessDaysBetween(NOW, dueDate);

        if (daysUntilDue < 0) {
          return {
            slaCategory: "Atrasado",
            slaBadgeClass: "danger",
            lifecycleStatus: "em andamento",
            isOverdue: true,
            isDueSoon: false,
            isWithinSla: false,
            businessDaysDelta: Math.abs(daysUntilDue),
            daysIndicatorValue: Math.abs(daysUntilDue),
            daysIndicatorDisplay: Math.abs(daysUntilDue) + " dia(s) Ãºteis de atraso",
            businessDaysToResolution: null
          };
        }

        if (daysUntilDue <= 2) {
          return {
            slaCategory: "PrÃ³ximo do vencimento",
            slaBadgeClass: "warning",
            lifecycleStatus: "em andamento",
            isOverdue: false,
            isDueSoon: true,
            isWithinSla: false,
            businessDaysDelta: daysUntilDue,
            daysIndicatorValue: daysUntilDue,
            daysIndicatorDisplay: daysUntilDue + " dia(s) Ãºteis restantes",
            businessDaysToResolution: null
          };
        }

        return {
          slaCategory: "Dentro do prazo",
          slaBadgeClass: "success",
          lifecycleStatus: "em andamento",
          isOverdue: false,
          isDueSoon: false,
          isWithinSla: true,
          businessDaysDelta: daysUntilDue,
          daysIndicatorValue: daysUntilDue,
          daysIndicatorDisplay: daysUntilDue + " dia(s) Ãºteis restantes",
          businessDaysToResolution: null
        };
      }

      function buildOperationalState(args) {
        const config = getOperationalWindowConfig(args.areaDisplay);

        if (!config || args.isResolved || !(args.dueDate instanceof Date) || typeof args.businessDaysUntilDue !== "number") {
          return {
            areaLabel: config ? config.label : "",
            threshold: config ? config.threshold : null,
            classification: "Fora da janela",
            badgeClass: "info",
            priority: 4,
            withinWindow: false
          };
        }

        const daysUntilDue = args.businessDaysUntilDue;
        if (daysUntilDue <= 0) {
          return {
            areaLabel: config.label,
            threshold: config.threshold,
            classification: "CrÃ­tico hoje",
            badgeClass: "danger",
            priority: 0,
            withinWindow: true
          };
        }

        if (daysUntilDue <= config.threshold) {
          const attentionThreshold = Math.max(1, Math.ceil(config.threshold / 2));
          if (daysUntilDue <= attentionThreshold) {
            return {
              areaLabel: config.label,
              threshold: config.threshold,
              classification: "Em atenÃ§Ã£o",
              badgeClass: "warning",
              priority: 1,
              withinWindow: true
            };
          }

          return {
            areaLabel: config.label,
            threshold: config.threshold,
            classification: "Dentro da janela",
            badgeClass: "success",
            priority: 2,
            withinWindow: true
          };
        }

        return {
          areaLabel: config.label,
          threshold: config.threshold,
          classification: "Fora da janela",
          badgeClass: "info",
          priority: 3,
          withinWindow: false
        };
      }

      function getOperationalWindowConfig(areaDisplay) {
        const normalizedArea = normalizeComparable(areaDisplay);
        return OPERATIONAL_WINDOWS.find(function (config) {
          return config.keys.includes(normalizedArea);
        }) || null;
      }

      function businessDaysBetween(startDate, endDate, allowNegativeSameDay) {
        if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
          return null;
        }

        const start = cloneDate(startDate);
        const end = cloneDate(endDate);

        if (start.getTime() === end.getTime()) {
          return 0;
        }

        let signal = 1;
        let from = start;
        let to = end;

        if (from > to) {
          signal = -1;
          from = end;
          to = start;
        }

        let count = 0;
        let cursor = cloneDate(from);
        cursor.setDate(cursor.getDate() + 1);

        while (cursor <= to) {
          if (isBusinessDay(cursor)) {
            count += 1;
          }
          cursor.setDate(cursor.getDate() + 1);
        }

        if (allowNegativeSameDay) {
          return count * signal;
        }

        return count * signal;
      }

      function isBusinessDay(date) {
        const day = date.getDay();
        return day !== 0 && day !== 6;
      }

      function cloneDate(date) {
        const cloned = new Date(date.getTime());
        cloned.setHours(0, 0, 0, 0);
        return cloned;
      }

      function parseBrazilianDate(value) {
        const text = safeString(value);
        if (!text) {
          return { date: null };
        }

        const cleaned = text.replace(/\s+/g, " ");
        const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);

        if (!match) {
          return { date: null };
        }

        const day = Number(match[1]);
        const month = Number(match[2]) - 1;
        const year = Number(match[3]);
        const hours = Number(match[4] || 0);
        const minutes = Number(match[5] || 0);
        const seconds = Number(match[6] || 0);
        const date = new Date(year, month, day, hours, minutes, seconds);

        if (
          Number.isNaN(date.getTime()) ||
          date.getFullYear() !== year ||
          date.getMonth() !== month ||
          date.getDate() !== day
        ) {
          return { date: null };
        }

        date.setHours(0, 0, 0, 0);
        return { date: date };
      }

      function applyFiltersAndRender() {
        populateFilterOptions();
        state.filteredRecords = getFilteredData();
        renderAll();
      }

      function getFilteredData(sourceRecords) {
        const records = Array.isArray(sourceRecords) ? sourceRecords : state.allRecords;
        const filters = getActiveFilters();

        return records.filter(function (record) {
          const matchesArea = !filters.area || safeDisplay(record.areaValue, record.areaDisplay) === filters.area;
          const matchesClient = !filters.client || record.clientDisplay === filters.client;
          const matchesStatus = !filters.status || record.statusDisplay === filters.status;
          const matchesSearch = !filters.search || record.searchBlob.includes(filters.search);
          const matchesStartDate = !filters.interval.start || (record.openedDate && record.openedDate >= filters.interval.start);
          const matchesEndDate = !filters.interval.end || (record.openedDate && record.openedDate <= filters.interval.end);
          return matchesArea && matchesClient && matchesStatus && matchesSearch && matchesStartDate && matchesEndDate;
        });
      }

      function getActiveFilters() {
        const startDateValue = elements.filters.startDate.value;
        const endDateValue = elements.filters.endDate.value;
        const startDate = startDateValue ? new Date(startDateValue + "T00:00:00") : null;
        const endDate = endDateValue ? new Date(endDateValue + "T00:00:00") : null;

        return {
          area: safeString(elements.filters.area.value),
          client: safeString(elements.filters.client.value),
          status: safeString(elements.filters.status.value),
          search: normalizeComparable(elements.filters.search.value),
          interval: normalizeDateInterval(startDate, endDate)
        };
      }

      function normalizeDateInterval(startDate, endDate) {
        if (startDate && endDate && startDate > endDate) {
          return {
            start: endDate,
            end: startDate
          };
        }

        return {
          start: startDate,
          end: endDate
        };
      }

      function populateFilterOptions() {
        syncSelectOptions(elements.filters.area, uniqueSortedValues(state.allRecords, "areaDisplay"), elements.filters.area.value);
        syncSelectOptions(elements.filters.client, uniqueSortedValues(state.allRecords, "clientDisplay"), elements.filters.client.value);
        syncSelectOptions(elements.filters.status, uniqueSortedValues(state.allRecords, "statusDisplay"), elements.filters.status.value);
      }

      function syncSelectOptions(select, values, currentValue) {
        const firstOption = select.options[0] ? select.options[0].textContent : "Todos";
        select.innerHTML = "";
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = firstOption;
        select.appendChild(defaultOption);

        values.forEach(function (value) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          if (value === currentValue) {
            option.selected = true;
          }
          select.appendChild(option);
        });
      }

      function uniqueSortedValues(records, key) {
        const seen = new Set();
        const values = [];

        records.forEach(function (record) {
          const value = safeDisplay(record[key], "");
          if (value && !seen.has(value)) {
            seen.add(value);
            values.push(value);
          }
        });

        return values.sort(function (a, b) {
          return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
        });
      }

      function renderAll() {
        renderMessages();
        renderImportSummary();
        renderFileImportList();
        renderDebugPanel();
        renderMetrics();
        renderSummaryText();
        renderOperationalOverview();
        renderCharts();
        renderTable();
        updateSortIndicators();
        updateActionState();
      }

      function renderMessages() {
        elements.messages.innerHTML = "";
        const pendingAreaWarnings = state.importedFiles
          .filter(function (entry) { return entry.requiresManualArea; })
          .map(function (entry) {
            return {
              type: "warn",
              text: "Arquivo " + entry.name + " estÃ¡ sem Ã¡rea final definida. Esse CSV nÃ£o entra na consolidaÃ§Ã£o atÃ© a Ã¡rea ser preenchida."
            };
          });
        const messages = []
          .concat(pendingAreaWarnings)
          .concat(state.errors.slice(-5).map(function (text) { return { type: "error", text: text }; }))
          .concat(state.warnings.slice(-6).map(function (text) { return { type: "warn", text: text }; }))
          .concat(state.infoMessages.slice(-10).map(function (text) { return { type: "info", text: text }; }));

        if (!messages.length) {
          const info = document.createElement("div");
          info.className = "message success";
          info.textContent = "Nenhum problema detectado atÃ© o momento. O painel estÃ¡ pronto para receber CSVs.";
          elements.messages.appendChild(info);
          return;
        }

        messages.forEach(function (entry) {
          const div = document.createElement("div");
          div.className = "message " + entry.type;
          div.textContent = entry.text;
          elements.messages.appendChild(div);
        });
      }

      function renderImportSummary() {
        const filesLoadedCount = state.importedFiles.length;
        const filteredRecords = getFilteredData();
        const recordsCount = state.allRecords.length;
        elements.fileCountLabel.textContent = filesLoadedCount
          ? filesLoadedCount + " arquivo(s) carregado(s)"
          : "Nenhum arquivo carregado.";
        elements.rowCountLabel.textContent = recordsCount + " ticket(s) consolidados.";
        elements.tableSubtitle.textContent = recordsCount
          ? filteredRecords.length + " ticket(s) no recorte atual."
          : "A tabela mostra o recorte atual aplicado pelos filtros.";
        elements.lastUpdatedLabel.textContent = filesLoadedCount
          ? "Atualizado em " + new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
              timeStyle: "short"
            }).format(new Date())
          : "Aguardando importaÃ§Ã£o.";
      }

      function renderDebugPanel() {
        const filteredRecords = getFilteredData();
        const areaBreakdown = aggregateCount(state.allRecords, "areaDisplay");
        elements.debugAllRecordsTotal.textContent = formatNumber(state.allRecords.length);
        elements.debugAreaBreakdown.textContent = areaBreakdown.length
          ? areaBreakdown.map(function (entry) {
              return entry.label + ": " + entry.value;
            }).join("\n")
          : "Nenhum dado.";
        elements.debugFilteredTotal.textContent = formatNumber(filteredRecords.length);
      }

      function renderFileImportList() {
        elements.fileImportList.innerHTML = "";

        if (!state.importedFiles.length) {
          const empty = document.createElement("div");
          empty.className = "file-empty";
          empty.textContent = "Os arquivos importados aparecerÃ£o aqui com a Ã¡rea detectada e opÃ§Ã£o de ajuste manual.";
          elements.fileImportList.appendChild(empty);
          return;
        }

        const fragment = document.createDocumentFragment();
        state.importedFiles.forEach(function (entry) {
          const card = document.createElement("div");
          card.className = "file-import-card" + (entry.requiresManualArea ? " needs-attention" : " ready");

          const fileMeta = document.createElement("div");
          fileMeta.className = "file-import-meta";
          fileMeta.innerHTML = "<strong>" + escapeHtml(entry.name) + "</strong><span>DiagnÃ³stico: " + entry.rows + " registro(s) importado(s) deste arquivo.</span>";

          const detected = document.createElement("div");
          detected.className = "file-import-meta";
          detected.innerHTML = "<strong>Ãrea do arquivo</strong><span>Detectada: " + escapeHtml(safeDisplay(entry.detectedArea, "Ajuste manual necessÃ¡rio")) + " (" + escapeHtml(describeAreaSource(entry.areaSource)) + "). Final aplicada: " + escapeHtml(safeDisplay(entry.finalArea, "Pendente")) + ".</span>";

          const inputWrap = document.createElement("div");
          inputWrap.className = "file-import-input";
          const label = document.createElement("label");
          label.textContent = "Ãrea final do arquivo";

          const inlineWrap = document.createElement("div");
          inlineWrap.className = "file-import-inline";

          const select = document.createElement("select");
          select.className = "file-area-select";
          select.setAttribute("data-file-id", entry.id);

          const placeholderOption = document.createElement("option");
          placeholderOption.value = "";
          placeholderOption.textContent = "Selecione a Ã¡rea";
          select.appendChild(placeholderOption);

          FILE_AREA_OPTIONS.forEach(function (optionValue) {
            const option = document.createElement("option");
            option.value = optionValue;
            option.textContent = optionValue;
            select.appendChild(option);
          });

          const otherOption = document.createElement("option");
          otherOption.value = FILE_AREA_OTHER_OPTION;
          otherOption.textContent = "Outra";
          select.appendChild(otherOption);
          select.value = entry.areaChoice || "";

          const input = document.createElement("input");
          input.type = "text";
          input.className = "file-area-input";
          input.setAttribute("data-file-id", entry.id);
          input.value = safeDisplay(entry.manualArea, "");
          input.placeholder = "Informe a Ã¡rea operacional";
          input.style.display = entry.areaChoice === FILE_AREA_OTHER_OPTION ? "block" : "none";

          inlineWrap.appendChild(select);
          inlineWrap.appendChild(input);
          inputWrap.appendChild(label);
          inputWrap.appendChild(inlineWrap);

          const statusWrap = document.createElement("div");
          statusWrap.className = "file-import-status";
          const statusBadge = document.createElement("span");
          statusBadge.className = "file-status-badge " + (entry.requiresManualArea ? "pending" : "ready");
          statusBadge.textContent = entry.requiresManualArea ? "Pendente" : "Pronto";
          const statusCopy = document.createElement("p");
          statusCopy.className = "file-status-copy";
          statusCopy.textContent = entry.requiresManualArea
            ? "Selecione uma Ã¡rea ou escolha Outra e preencha manualmente. Enquanto isso, este arquivo nÃ£o entra na consolidaÃ§Ã£o."
            : "Ãrea final aplicada: " + safeDisplay(entry.finalArea, "NÃ£o informada") + ". Este arquivo jÃ¡ estÃ¡ pronto para uso no painel.";
          statusWrap.appendChild(statusBadge);
          statusWrap.appendChild(statusCopy);

          card.appendChild(fileMeta);
          card.appendChild(detected);
          card.appendChild(inputWrap);
          card.appendChild(statusWrap);
          fragment.appendChild(card);
        });

        elements.fileImportList.appendChild(fragment);
      }

      function renderMetrics() {
        const records = getFilteredData();
        const total = records.length;
        const resolved = records.filter(function (item) { return item.isResolved; }).length;
        const overdue = records.filter(function (item) { return item.isOverdue; }).length;
        const onTime = records.filter(function (item) {
          return item.slaCategory === "Dentro do prazo" || item.slaCategory === "Resolvido no prazo";
        }).length;
        const atRisk = records.filter(function (item) { return item.isDueSoon; }).length;
        const resolvedOnTime = records.filter(function (item) { return item.slaCategory === "Resolvido no prazo"; }).length;
        const slaPercent = resolved > 0 ? (resolvedOnTime / resolved) * 100 : 0;

        elements.metrics.total.textContent = formatNumber(total);
        elements.metrics.resolved.textContent = formatNumber(resolved);
        elements.metrics.overdue.textContent = formatNumber(overdue);
        elements.metrics.onTime.textContent = formatNumber(onTime);
        elements.metrics.atRisk.textContent = formatNumber(atRisk);
        elements.metrics.sla.textContent = formatPercent(slaPercent);
      }

      function renderSummaryText() {
        const records = getFilteredData();
        if (!records.length) {
          elements.summaryText.textContent = state.allRecords.length
            ? "Nenhum ticket atende aos filtros atuais. Ajuste o recorte para visualizar resultados."
            : "Carregue pelo menos um CSV para gerar o resumo automÃ¡tico.";
          return;
        }

        const overdue = records.filter(function (item) { return item.isOverdue; }).length;
        const dueSoon = records.filter(function (item) { return item.isDueSoon; }).length;
        const areas = aggregateCount(records, "areaDisplay");
        const topArea = areas[0];
        const clients = aggregateCount(records, "clientDisplay");
        const topClient = clients[0];
        const resolved = records.filter(function (item) { return item.isResolved; }).length;
        const averageResolution = average(records
          .map(function (item) { return item.businessDaysToResolution; })
          .filter(function (value) { return typeof value === "number"; }));
        const text = [
          overdue + " ticket(s) atrasado(s)",
          dueSoon + " prÃ³ximo(s) do vencimento",
          resolved + " resolvido(s)",
          topArea ? "maior concentraÃ§Ã£o na Ã¡rea " + topArea.label : "",
          topClient ? "cliente com maior volume: " + topClient.label : "",
          averageResolution !== null ? "tempo mÃ©dio atÃ© resoluÃ§Ã£o: " + averageResolution + " dia(s) Ãºteis" : ""
        ].filter(Boolean).join(", ") + ".";

        elements.summaryText.textContent = text.charAt(0).toUpperCase() + text.slice(1);
      }

      function renderOperationalOverview() {
        renderAlertList();
        renderWindowSummary();
      }

      function renderAlertList() {
        elements.alertList.innerHTML = "";
        const filteredRecords = getFilteredData();
        const alerts = buildOperationalAlerts(filteredRecords);

        if (!alerts.length) {
          const empty = document.createElement("div");
          empty.className = "file-empty";
          empty.textContent = "Nenhum alerta operacional no recorte atual.";
          elements.alertList.appendChild(empty);
          return;
        }

        const fragment = document.createDocumentFragment();
        alerts.forEach(function (alert) {
          const item = document.createElement("div");
          item.className = "alert-item";
          item.innerHTML = "<strong>" + escapeHtml(alert.title) + "</strong><span>" + escapeHtml(alert.text) + "</span>";
          fragment.appendChild(item);
        });
        elements.alertList.appendChild(fragment);
      }

      function renderWindowSummary() {
        elements.windowSummaryList.innerHTML = "";
        const filteredRecords = getFilteredData();
        const summary = buildOperationalWindowSummary(filteredRecords);

        if (!summary.length) {
          const empty = document.createElement("div");
          empty.className = "file-empty";
          empty.textContent = "Carregue tickets abertos de Pluggy, S1NC ou Winner para visualizar as janelas crÃ­ticas.";
          elements.windowSummaryList.appendChild(empty);
          return;
        }

        const fragment = document.createDocumentFragment();
        summary.forEach(function (entry) {
          const item = document.createElement("div");
          item.className = "window-item";
          item.innerHTML =
            "<strong>" + escapeHtml(entry.label) + "</strong>" +
            "<span class=\"count\">" + escapeHtml(String(entry.count)) + "</span>" +
            "<span>" + escapeHtml(entry.description) + "</span>" +
            "<span class=\"meta\">" + escapeHtml(entry.meta) + "</span>";
          fragment.appendChild(item);
        });
        elements.windowSummaryList.appendChild(fragment);
      }

      function buildOperationalWindowSummary(records) {
        return OPERATIONAL_WINDOWS.map(function (config) {
          const groupRecords = records.filter(function (record) {
            return record.operationalAreaLabel === config.label;
          });
          const withinWindow = groupRecords.filter(function (record) {
            return record.withinOperationalWindow;
          });
          const criticalToday = withinWindow.filter(function (record) {
            return record.operationalClassification === "CrÃ­tico hoje";
          }).length;
          const inAttention = withinWindow.filter(function (record) {
            return record.operationalClassification === "Em atenÃ§Ã£o";
          }).length;

          return {
            label: config.label,
            count: withinWindow.length,
            description: withinWindow.length + " ticket(s) com vencimento em atÃ© " + config.threshold + " dia(s) Ãºteis",
            meta: criticalToday + " crÃ­tico(s) hoje/atrasado(s), " + inAttention + " em atenÃ§Ã£o"
          };
        }).filter(function (entry) {
          return entry.count > 0 || records.some(function (record) {
            return record.operationalAreaLabel === entry.label;
          });
        });
      }

      function buildOperationalAlerts(records) {
        return buildOperationalWindowSummary(records)
          .filter(function (entry) { return entry.count > 0; })
          .map(function (entry) {
            const config = OPERATIONAL_WINDOWS.find(function (item) {
              return item.label === entry.label;
            });
            const count = entry.count;
            let text = count + " ticket(s) da " + entry.label + " estÃƒÂ£o a atÃƒÂ© " + config.threshold + " dia(s) ÃƒÂºteis do vencimento.";
            if (config.label === "Winner") {
              text = count + " ticket(s) da Winner estÃƒÂ£o a atÃƒÂ© 1 dia ÃƒÂºtil do vencimento.";
            } else if (config.label === "S1NC") {
              text = count + " ticket(s) da S1NC estÃƒÂ£o prÃƒÂ³ximos do vencimento.";
            } else if (config.label === "Pluggy") {
              text = count + " ticket(s) da Pluggy estÃƒÂ£o dentro da janela crÃƒÂ­tica.";
            }
            return {
              title: "AtenÃƒÂ§ÃƒÂ£o: " + count + " ticket(s) monitorado(s) em " + entry.label,
              text: text
            };
          });
      }

      function renderCharts() {
        renderStatusChart();
      }

      function renderStatusChart() {
        const records = getFilteredData();
        const dataMap = {
          "Resolvido no prazo": 0,
          "Resolvido atrasado": 0,
          "Dentro do prazo": 0,
          "PrÃ³ximo do vencimento": 0,
          "Atrasado": 0,
          "Sem data limite": 0,
          "Resolvido sem data limite": 0
        };

        records.forEach(function (record) {
          dataMap[record.slaCategory] = (dataMap[record.slaCategory] || 0) + 1;
        });

        const labels = Object.keys(dataMap).filter(function (key) {
          return dataMap[key] > 0;
        });
        const values = labels.map(function (label) { return dataMap[label]; });

        if (!labels.length) {
          setChartEmptyState("status", true);
          return;
        }

        setChartEmptyState("status", false);

        upsertChart("status", {
          type: "pie",
          data: {
            labels: labels,
            datasets: [{
              data: values,
              backgroundColor: ["#1d7d4f", "#b23a3a", "#01DDD5", "#b67611", "#d65b5b", "#52676D", "#96A7AC"],
              borderColor: "#ffffff",
              borderWidth: 2
            }]
          },
          options: chartOptions({
            plugins: {
              legend: { position: "bottom" }
            }
          })
        });
      }

      function setChartEmptyState(key, isEmpty) {
        if (state.charts[key]) {
          state.charts[key].destroy();
          state.charts[key] = null;
        }

        if (elements.chartCanvas[key]) {
          elements.chartCanvas[key].hidden = isEmpty;
        }

        if (elements.chartEmptyState[key]) {
          elements.chartEmptyState[key].hidden = !isEmpty;
        }
      }

      function upsertChart(key, config) {
        if (state.charts[key]) {
          state.charts[key].destroy();
        }
        state.charts[key] = new Chart(elements.chartCanvas[key], config);
      }

      function chartOptions(overrides) {
        return mergeObjects({
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: "#52676D",
                font: {
                  family: varFont(),
                  size: 12
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label ? context.label + ": " : "";
                  return label + context.parsed;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: { color: "#96A7AC" },
              grid: { color: "rgba(150, 167, 172, 0.2)" }
            },
            y: {
              ticks: { color: "#96A7AC" },
              grid: { color: "rgba(150, 167, 172, 0.2)" }
            }
          }
        }, overrides || {});
      }

      function renderTable() {
        const rows = getFilteredData().slice().sort(compareRecords);
        elements.tableBody.innerHTML = "";

        if (!rows.length) {
          const row = document.createElement("tr");
          const cell = document.createElement("td");
          cell.colSpan = 10;
          cell.className = "empty-state";
          cell.textContent = state.allRecords.length
            ? "Nenhum ticket encontrado para os filtros atuais."
            : "Nenhum dado carregado ainda.";
          row.appendChild(cell);
          elements.tableBody.appendChild(row);
          return;
        }

        const fragment = document.createDocumentFragment();

        rows.forEach(function (record) {
          const tr = document.createElement("tr");
          tr.className = record.isOverdue ? "row-danger" : (record.isDueSoon ? "row-warning" : (record.isWithinSla ? "row-success" : ""));

          tr.appendChild(buildTicketCell(record));
          tr.appendChild(buildTextCell(record.clientDisplay));
          tr.appendChild(buildTextCell(record.areaDisplay));
          tr.appendChild(buildTextCell(record.openedDateDisplay));
          tr.appendChild(buildTextCell(record.dueDateDisplay));
          tr.appendChild(buildPillCell(record.slaCategory, record.slaBadgeClass));
          tr.appendChild(buildPillCell(record.statusDisplay, "info"));
          tr.appendChild(buildPillCell(record.operationalClassification, record.operationalBadgeClass));
          tr.appendChild(buildTextCell(record.resolvedDateDisplay));
          tr.appendChild(buildPillCell(record.daysIndicatorDisplay, record.slaBadgeClass));

          fragment.appendChild(tr);
        });

        elements.tableBody.appendChild(fragment);
      }

      function buildTicketCell(record) {
        const cell = document.createElement("td");
        if (record.ticketUrl) {
          const link = document.createElement("a");
          link.className = "ticket-link";
          link.href = record.ticketUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = record.ticket;
          cell.appendChild(link);
        } else {
          cell.textContent = record.ticket;
        }
        return cell;
      }

      function buildTextCell(value) {
        const cell = document.createElement("td");
        cell.textContent = safeDisplay(value, "â€”");
        return cell;
      }

      function buildPillCell(text, kind) {
        const cell = document.createElement("td");
        const pill = document.createElement("span");
        pill.className = "pill " + kind;
        pill.textContent = safeDisplay(text, "â€”");
        cell.appendChild(pill);
        return cell;
      }

      function compareRecords(a, b) {
        const direction = state.sort.direction === "asc" ? 1 : -1;
        const key = state.sort.key;
        const valueA = getComparableValue(a, key);
        const valueB = getComparableValue(b, key);

        if (typeof valueA === "number" && typeof valueB === "number") {
          if (valueA === valueB) {
            return a.ticket.localeCompare(b.ticket, "pt-BR", { sensitivity: "base" });
          }
          return (valueA - valueB) * direction;
        }

        return String(valueA).localeCompare(String(valueB), "pt-BR", { sensitivity: "base" }) * direction;
      }

      function getComparableValue(record, key) {
        switch (key) {
          case "openedDate":
            return record.openedDate ? record.openedDate.getTime() : -Infinity;
          case "dueDate":
            return record.dueDate ? record.dueDate.getTime() : -Infinity;
          case "resolvedDate":
            return record.resolvedDate ? record.resolvedDate.getTime() : -Infinity;
          case "daysIndicatorValue":
            return Number.isFinite(record.daysIndicatorValue) ? record.daysIndicatorValue : Number.POSITIVE_INFINITY;
          case "operationalPriority":
            return typeof record.operationalPriority === "number" ? record.operationalPriority : Number.POSITIVE_INFINITY;
          case "ticket":
          case "clientDisplay":
          case "areaDisplay":
          case "slaCategory":
          case "statusDisplay":
          case "operationalClassification":
            return safeDisplay(record[key], "");
          default:
            return safeDisplay(record[key], "");
        }
      }

      function updateSortIndicators() {
        elements.sortableHeaders.forEach(function (header) {
          const key = header.getAttribute("data-sort");
          header.classList.remove("sorted-asc", "sorted-desc");
          if (key === state.sort.key) {
            header.classList.add(state.sort.direction === "asc" ? "sorted-asc" : "sorted-desc");
          }
        });
      }

      function exportFilteredData() {
        const filteredRecords = getFilteredData();
        if (!filteredRecords.length) {
          pushMessage("warn", "NÃ£o hÃ¡ tickets filtrados para exportar.");
          renderMessages();
          return;
        }

        const headers = [
          "Ticket",
          "Cliente",
          "Ãrea",
          "Data abertura",
          "Data limite",
          "SLA",
          "Status",
          "ClassificaÃ§Ã£o operacional",
          "Data resoluÃ§Ã£o",
          "Dias restantes/atraso"
        ];

        const lines = [headers];
        filteredRecords.slice().sort(compareRecords).forEach(function (record) {
          lines.push([
            record.ticket,
            record.clientDisplay,
            record.areaDisplay,
            record.openedDateDisplay,
            record.dueDateDisplay,
            record.slaCategory,
            record.statusDisplay,
            record.operationalClassification,
            record.resolvedDateDisplay,
            record.daysIndicatorDisplay
          ]);
        });

        const csv = lines.map(function (line) {
          return line.map(csvEscape).join(";");
        }).join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "tickets-filtrados-" + formatDateFile(new Date()) + ".csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      function resetFilters() {
        elements.filters.area.value = "";
        elements.filters.client.value = "";
        elements.filters.status.value = "";
        elements.filters.search.value = "";
        elements.filters.startDate.value = "";
        elements.filters.endDate.value = "";
        applyFiltersAndRender();
      }

      function clearAllData() {
        state.importedFiles = [];
        state.rawRecords = [];
        state.allRecords = [];
        state.filteredRecords = [];
        state.filesLoaded = [];
        state.nextImportId = 1;
        state.warnings = [];
        state.errors = [];
        state.infoMessages = [];
        destroyCharts();
        elements.filters.area.value = "";
        elements.filters.client.value = "";
        elements.filters.status.value = "";
        elements.filters.search.value = "";
        elements.filters.startDate.value = "";
        elements.filters.endDate.value = "";
        renderAll();
      }

      function destroyCharts() {
        Object.keys(state.charts).forEach(function (key) {
          if (state.charts[key]) {
            state.charts[key].destroy();
            state.charts[key] = null;
          }
        });
      }

      function updateActionState() {
        const filteredRecords = getFilteredData();
        const hasData = state.allRecords.length > 0;
        elements.clearDataButton.disabled = !hasData;
        elements.exportCsvButton.disabled = !filteredRecords.length;
      }

      function aggregateCount(records, key) {
        const counts = new Map();

        records.forEach(function (record) {
          const label = safeDisplay(record[key], "NÃ£o informado");
          counts.set(label, (counts.get(label) || 0) + 1);
        });

        return Array.from(counts.entries())
          .map(function (entry) {
            return { label: entry[0], value: entry[1] };
          })
          .sort(function (a, b) {
            if (b.value === a.value) {
              return a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" });
            }
            return b.value - a.value;
          });
      }

      function formatDate(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
          return "";
        }
        return new Intl.DateTimeFormat("pt-BR").format(date);
      }

      function formatDateFile(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return year + month + day + "-" + hours + minutes;
      }

      function formatPercent(value) {
        return new Intl.NumberFormat("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        }).format(value) + "%";
      }

      function formatNumber(value) {
        return new Intl.NumberFormat("pt-BR").format(value || 0);
      }

      function safeString(value) {
        return value == null ? "" : String(value).trim();
      }

      function safeDisplay(value, fallback) {
        const text = safeString(value);
        return text || fallback;
      }

      function normalizeComparable(value) {
        return safeString(value)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
      }

      function normalizeKey(value) {
        return normalizeComparable(value)
          .replace(/[^\w\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }

      function normalizeUrl(value) {
        const text = safeString(value);
        if (!text) {
          return "";
        }
        return /^https?:\/\//i.test(text) ? text : "";
      }

      function csvEscape(value) {
        const text = String(value == null ? "" : value);
        if (/[;"\n]/.test(text)) {
          return "\"" + text.replace(/"/g, "\"\"") + "\"";
        }
        return text;
      }

      function mergeObjects(target, source) {
        const result = Object.assign({}, target);
        Object.keys(source || {}).forEach(function (key) {
          const targetValue = result[key];
          const sourceValue = source[key];
          const bothObjects = isPlainObject(targetValue) && isPlainObject(sourceValue);
          result[key] = bothObjects ? mergeObjects(targetValue, sourceValue) : sourceValue;
        });
        return result;
      }

      function isPlainObject(value) {
        return value && typeof value === "object" && !Array.isArray(value);
      }

      function varFont() {
        return getComputedStyle(document.documentElement).getPropertyValue("--font").trim() || "Segoe UI";
      }

      function dedupeMessages(messages) {
        return Array.from(new Set(messages.filter(Boolean)));
      }

      function average(values) {
        if (!values.length) {
          return null;
        }
        const total = values.reduce(function (sum, value) {
          return sum + value;
        }, 0);
        return new Intl.NumberFormat("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        }).format(total / values.length);
      }

      function clearTransientMessages() {
        state.errors = [];
        state.infoMessages = [];
      }

      function pushMessage(type, text) {
        if (type === "error") {
          state.errors.push(text);
          return;
        }
        if (type === "warn") {
          state.warnings.push(text);
          return;
        }
        state.infoMessages.push(text);
      }

      function escapeHtml(value) {
        return String(value == null ? "" : value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }
    }());
