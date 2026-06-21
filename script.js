
    const STORAGE_KEY = "painel_ferias_ssl_clean_v1";
    const ALERT_DAYS_BEFORE = 5;
    const ALERT_STORAGE_KEY = "painel_ferias_ssl_alertas_v1";

    const state = {
      funcionarios: [],
      editandoId: null,
      editandoFerias: null,
      busca: "",
      filtroSaldo: "todos",
      filtroFerias: "todos"
    };

    const el = {
      cardsResumo: document.getElementById("cardsResumo"),
      tbodyFuncionarios: document.getElementById("tbodyFuncionarios"),
      proximasFerias: document.getElementById("proximasFerias"),
      alertasGestao: document.getElementById("alertasGestao"),

      formsWrap: document.getElementById("formsWrap"),
      employeeFormPanel: document.getElementById("employeeFormPanel"),
      vacationFormPanel: document.getElementById("vacationFormPanel"),

      btnToggleForms: document.getElementById("btnToggleForms"),
      btnOpenEmployeeForm: document.getElementById("btnOpenEmployeeForm"),
      btnOpenVacationForm: document.getElementById("btnOpenVacationForm"),
      btnCloseEmployeeForm: document.getElementById("btnCloseEmployeeForm"),
      btnCloseVacationForm: document.getElementById("btnCloseVacationForm"),
      btnClearAllData: document.getElementById("btnClearAllData"),

      btnExportJson: document.getElementById("btnExportJson"),
      btnImportJson: document.getElementById("btnImportJson"),
      importJsonFile: document.getElementById("importJsonFile"),

      formFuncionario: document.getElementById("formFuncionario"),
      formFerias: document.getElementById("formFerias"),

      tituloFormulario: document.getElementById("tituloFormulario"),
      statusEdicao: document.getElementById("statusEdicao"),
      btnSalvarFuncionario: document.getElementById("btnSalvarFuncionario"),
      btnCancelarEdicao: document.getElementById("btnCancelarEdicao"),
      btnSalvarFerias: document.getElementById("btnSalvarFerias"),

      nome: document.getElementById("nome"),
      matricula: document.getElementById("matricula"),
      supervisor: document.getElementById("supervisor"),
      admissao: document.getElementById("admissao"),
      saldo: document.getElementById("saldo"),
      observacao: document.getElementById("observacao"),

      funcionarioFerias: document.getElementById("funcionarioFerias"),
      funcionarioSelecionadoLabel: document.getElementById("funcionarioSelecionadoLabel"),
      inicioFerias: document.getElementById("inicioFerias"),
      fimFerias: document.getElementById("fimFerias"),
      statusFerias: document.getElementById("statusFerias"),
      labelFerias: document.getElementById("labelFerias"),
      obsFerias: document.getElementById("obsFerias"),
      btnLimparFerias: document.getElementById("btnLimparFerias"),

      busca: document.getElementById("busca"),
      filtroSaldo: document.getElementById("filtroSaldo"),
      filtroFerias: document.getElementById("filtroFerias")
    };

    function uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    }

    function parseDate(value) {
      if (!value) return null;
      const date = new Date(value + "T00:00:00");
      return isNaN(date) ? null : date;
    }

    function formatDate(value) {
      if (!value) return "—";
      const date = parseDate(value);
      if (!date) return "—";
      return date.toLocaleDateString("pt-BR");
    }

    function diffDays(start, end) {
      const a = parseDate(start);
      const b = parseDate(end);
      if (!a || !b) return 0;
      return Math.floor((b - a) / 86400000) + 1;
    }

    function startOfDay(date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    function daysUntil(dateValue) {
      const target = parseDate(dateValue);
      if (!target) return null;

      const today = startOfDay(new Date());
      const targetDay = startOfDay(target);

      return Math.floor((targetDay - today) / 86400000);
    }

    function safeNumber(value) {
      if (value === null || value === undefined || value === "") return null;
      const n = Number(value);
      return Number.isNaN(n) ? null : n;
    }

    function normalizeFuncionario(item) {
      return {
        id: item.id || uid(),
        nome: item.nome || "",
        matricula: item.matricula || "",
        supervisor: item.supervisor || "",
        admissao: item.admissao || "",
        saldo: safeNumber(item.saldo),
        observacao: item.observacao || "",
        ferias: Array.isArray(item.ferias)
          ? item.ferias.map(f => ({
              id: f.id || uid(),
              inicio: f.inicio || "",
              fim: f.fim || "",
              status: f.status || "Planejado",
              label: f.label || "",
              observacao: f.observacao || ""
            }))
          : []
        ,
        creditedYears: Number.isInteger(item.creditedYears) ? item.creditedYears : (item.creditedYears ?? 0)
      };
    }

    function yearsSince(dateValue) {
      const d = parseDate(dateValue);
      if (!d) return 0;
      const today = new Date();
      let years = today.getFullYear() - d.getFullYear();
      const anniversary = new Date(today.getFullYear(), d.getMonth(), d.getDate());
      if (today < anniversary) years--;
      return years;
    }

    function applyAnniversaryCredits() {
      let changed = false;

      state.funcionarios.forEach(funcionario => {
        if (!funcionario.admissao) {
          funcionario.creditedYears = funcionario.creditedYears ?? 0;
          return;
        }

        const years = yearsSince(funcionario.admissao);
        const credited = Number.isInteger(funcionario.creditedYears) ? funcionario.creditedYears : (funcionario.creditedYears ?? 0);

        if (years > credited) {
          const delta = years - credited;
          funcionario.saldo = (typeof funcionario.saldo === 'number' ? funcionario.saldo : 0) + 30 * delta;
          funcionario.creditedYears = years;
          changed = true;
        }
      });

      if (changed) saveData();
      return changed;
    }

    /* =========================
       IMPORT / EXPORT JSON
    ========================= */
    function mergeText(a, b) {
      const left = (a || "").trim();
      const right = (b || "").trim();

      if (!left) return right;
      if (!right) return left;
      if (left === right) return left;

      return `${left} | ${right}`;
    }

    function funcionarioKey(funcionario) {
      return (funcionario.matricula || "").trim().toLowerCase();
    }

    function vacationKey(vacation) {
      return [
        vacation.inicio || "",
        vacation.fim || "",
        (vacation.status || "").trim().toLowerCase(),
        (vacation.label || "").trim().toLowerCase()
      ].join("|");
    }

    function mergeFerias(localFerias = [], importedFerias = []) {
      const mapa = new Map();

      [...localFerias, ...importedFerias].forEach(item => {
        const ferias = {
          id: item.id || uid(),
          inicio: item.inicio || "",
          fim: item.fim || "",
          status: item.status || "Planejado",
          label: item.label || "",
          observacao: item.observacao || ""
        };

        const key = vacationKey(ferias);

        if (!mapa.has(key)) {
          mapa.set(key, ferias);
        } else {
          const atual = mapa.get(key);
          mapa.set(key, {
            ...atual,
            status: ferias.status || atual.status,
            label: ferias.label || atual.label,
            observacao: mergeText(atual.observacao, ferias.observacao)
          });
        }
      });

      return [...mapa.values()].sort((a, b) => {
        const da = parseDate(a.inicio);
        const db = parseDate(b.inicio);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
      });
    }

    function mergeFuncionario(local, imported) {
      return {
        ...local,
        nome: imported.nome || local.nome,
        matricula: local.matricula || imported.matricula,
        supervisor: imported.supervisor || local.supervisor,
        admissao: imported.admissao || local.admissao,
        saldo: imported.saldo ?? local.saldo,
        observacao: mergeText(local.observacao, imported.observacao),
        ferias: mergeFerias(local.ferias, imported.ferias)
      };
    }

    function buildExportPayload() {
      return {
        app: "Painel de Planejamento de Férias - SSL 1",
        version: 1,
        exportedAt: new Date().toISOString(),
        funcionarios: state.funcionarios.map(normalizeFuncionario)
      };
    }

    function downloadJson(filename, data) {
      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json;charset=utf-8" }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    function exportDataAsJson() {
      const agora = new Date();
      const data = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
      const hora = `${String(agora.getHours()).padStart(2, "0")}-${String(agora.getMinutes()).padStart(2, "0")}`;
      const filename = `ferias_ssl_${data}_${hora}.json`;

      downloadJson(filename, buildExportPayload());
    }

    function extractFuncionariosFromImport(parsed) {
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.funcionarios)) return parsed.funcionarios;
      return null;
    }

    function mergeImportedData(importedFuncionarios) {
      const mapa = new Map();

      state.funcionarios.forEach(item => {
        const normalizado = normalizeFuncionario(item);
        const key = funcionarioKey(normalizado);
        if (key) mapa.set(key, normalizado);
      });

      importedFuncionarios.forEach(item => {
        const normalizado = normalizeFuncionario(item);
        const key = funcionarioKey(normalizado);

        if (!key) return;

        if (!mapa.has(key)) {
          mapa.set(key, normalizado);
        } else {
          const atual = mapa.get(key);
          mapa.set(key, mergeFuncionario(atual, normalizado));
        }
      });

      state.funcionarios = [...mapa.values()].sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );
    }

    async function importDataFromJsonFile(file) {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const funcionariosImportados = extractFuncionariosFromImport(parsed);

      if (!funcionariosImportados) {
        throw new Error("Arquivo JSON inválido. Estrutura de funcionários não encontrada.");
      }

      mergeImportedData(funcionariosImportados);
      applyAnniversaryCredits();
      saveData();
      renderAll();

      return funcionariosImportados.length;
    }

    /* =========================
       STORAGE
    ========================= */
    function saveData() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.funcionarios));
    }

    function loadData() {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        state.funcionarios = [];
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        const funcionarios = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.funcionarios)
            ? parsed.funcionarios
            : [];

        state.funcionarios = funcionarios.map(normalizeFuncionario);
        applyAnniversaryCredits();
      } catch {
        state.funcionarios = [];
      }
    }

    /* =========================
       ALERTAS DE FÉRIAS PRÓXIMAS
    ========================= */
    function getVacationsStartingSoon(daysBefore = ALERT_DAYS_BEFORE) {
      const alerts = [];

      state.funcionarios.forEach(funcionario => {
        funcionario.ferias.forEach(ferias => {
          if (!ferias.inicio) return;

          const diasRestantes = daysUntil(ferias.inicio);

          if (diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= daysBefore) {
            alerts.push({
              funcionario,
              ferias,
              diasRestantes
            });
          }
        });
      });

      return alerts.sort((a, b) => {
        const da = parseDate(a.ferias.inicio);
        const db = parseDate(b.ferias.inicio);
        return da - db;
      });
    }

    function getAlertMessage(item) {
      if (item.diasRestantes === 0) {
        return `${item.funcionario.nome} inicia férias hoje (${formatDate(item.ferias.inicio)}).`;
      }

      if (item.diasRestantes === 1) {
        return `${item.funcionario.nome} inicia férias amanhã (${formatDate(item.ferias.inicio)}).`;
      }

      return `${item.funcionario.nome} inicia férias em ${item.diasRestantes} dias (${formatDate(item.ferias.inicio)}).`;
    }

    function getTodayAlertRegistry() {
      try {
        return JSON.parse(localStorage.getItem(ALERT_STORAGE_KEY)) || {};
      } catch {
        return {};
      }
    }

    function saveTodayAlertRegistry(data) {
      localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(data));
    }

    function notifyUpcomingVacations() {
      const alerts = getVacationsStartingSoon(ALERT_DAYS_BEFORE);
      if (!alerts.length) return;

      const todayKey = new Date().toISOString().slice(0, 10);
      const registry = getTodayAlertRegistry();

      const pending = alerts.filter(item => {
        const key = `${todayKey}::${item.funcionario.matricula}::${item.ferias.inicio}`;
        return !registry[key];
      });

      if (!pending.length) return;

      const message = pending
        .map(item => `• ${getAlertMessage(item)}`)
        .join("\n");

      alert(`Atenção: férias próximas\n\n${message}`);

      pending.forEach(item => {
        const key = `${todayKey}::${item.funcionario.matricula}::${item.ferias.inicio}`;
        registry[key] = true;
      });

      saveTodayAlertRegistry(registry);
    }

    /* =========================
       FORMATAÇÃO VISUAL
    ========================= */
    function formatSaldo(value) {
      if (value === null || value === undefined || value === "") return "Sem saldo";
      return value > 0 ? `+${value}` : `${value}`;
    }

    function saldoBadgeClass(value) {
      if (value === null || value === undefined || value === "") return "default";
      if (value < 0) return "negative";
      if (value > 0) return "positive";
      return "default";
    }

    function statusClass(status) {
      const s = (status || "").toLowerCase();
      if (s === "confirmado") return "status-confirmado";
      if (s === "pendente") return "status-pendente";
      return "status-planejado";
    }

    /* =========================
       CONTROLE DOS FORMULÁRIOS
    ========================= */
    function updateFormsShellState() {
      const employeeVisible = el.employeeFormPanel.style.display !== "none";
      const vacationVisible = el.vacationFormPanel.style.display !== "none";

      if (employeeVisible || vacationVisible) {
        el.formsWrap.classList.remove("hidden");
        el.btnToggleForms.textContent = "Ocultar cadastros";
      } else {
        el.formsWrap.classList.add("hidden");
        el.btnToggleForms.textContent = "Mostrar cadastros";
      }
    }

    function showEmployeeForm() {
      el.formsWrap.classList.remove("hidden");
      el.employeeFormPanel.style.display = "block";
      updateFormsShellState();
    }

    function hideEmployeeForm() {
      el.employeeFormPanel.style.display = "none";
      updateFormsShellState();
    }

    function toggleEmployeeForm() {
      const isVisible = el.employeeFormPanel.style.display !== "none";
      if (isVisible) hideEmployeeForm();
      else showEmployeeForm();
    }

    function showVacationForm() {
      el.formsWrap.classList.remove("hidden");
      el.vacationFormPanel.style.display = "block";
      updateFormsShellState();
    }

    function hideVacationForm() {
      el.vacationFormPanel.style.display = "none";
      updateFormsShellState();
    }

    function toggleVacationForm() {
      const isVisible = el.vacationFormPanel.style.display !== "none";
      if (isVisible) hideVacationForm();
      else showVacationForm();
    }

    function toggleForms() {
      const hidden = el.formsWrap.classList.contains("hidden");

      if (hidden) {
        el.formsWrap.classList.remove("hidden");

        const employeeVisible = el.employeeFormPanel.style.display !== "none";
        const vacationVisible = el.vacationFormPanel.style.display !== "none";

        if (!employeeVisible && !vacationVisible) {
          el.employeeFormPanel.style.display = "block";
        }

        el.btnToggleForms.textContent = "Ocultar cadastros";
      } else {
        el.employeeFormPanel.style.display = "none";
        el.vacationFormPanel.style.display = "none";
        el.formsWrap.classList.add("hidden");
        el.btnToggleForms.textContent = "Mostrar cadastros";
      }
    }

    /* =========================
       LIMPEZA DOS FORMS
    ========================= */
    function clearEmployeeForm() {
      state.editandoId = null;
      el.formFuncionario.reset();
      el.tituloFormulario.textContent = "Cadastrar funcionário";
      el.statusEdicao.textContent = "Novo registro";
      el.btnSalvarFuncionario.textContent = "Salvar funcionário";
      el.btnCancelarEdicao.style.display = "none";
    }

    function clearVacationForm() {
      state.editandoFerias = null;
      el.formFerias.reset();
      el.funcionarioFerias.disabled = false;
      el.btnSalvarFerias.textContent = "Cadastrar férias";
      updateSelectedEmployeeLabel();
    }

    function updateSelectedEmployeeLabel() {
      const funcionario = state.funcionarios.find(
        item => item.id === el.funcionarioFerias.value
      );

      el.funcionarioSelecionadoLabel.textContent = funcionario
        ? `${funcionario.nome} • Matrícula ${funcionario.matricula}`
        : "Selecione um funcionário";
    }

    function refreshFuncionarioSelect() {
      const currentValue = el.funcionarioFerias.value;

      const options = state.funcionarios
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map(item => `<option value="${item.id}">${item.nome} • ${item.matricula}</option>`)
        .join("");

      el.funcionarioFerias.innerHTML = `<option value="">Selecione...</option>${options}`;

      if (state.funcionarios.some(item => item.id === currentValue)) {
        el.funcionarioFerias.value = currentValue;
      }

      updateSelectedEmployeeLabel();
    }

    /* =========================
       FILTROS E RENDER
    ========================= */
    function getFilteredFuncionarios() {
      return state.funcionarios.filter(item => {
        const termo = state.busca.toLowerCase().trim();

        const matchesBusca =
          !termo ||
          item.nome.toLowerCase().includes(termo) ||
          item.matricula.toLowerCase().includes(termo) ||
          item.supervisor.toLowerCase().includes(termo);

        let matchesSaldo = true;
        if (state.filtroSaldo === "negativo") {
          matchesSaldo = typeof item.saldo === "number" && item.saldo < 0;
        } else if (state.filtroSaldo === "positivo") {
          matchesSaldo = typeof item.saldo === "number" && item.saldo > 0;
        } else if (state.filtroSaldo === "vazio") {
          matchesSaldo = item.saldo === null || item.saldo === "";
        }

        let matchesFerias = true;
        if (state.filtroFerias === "com") {
          matchesFerias = item.ferias.length > 0;
        } else if (state.filtroFerias === "sem") {
          matchesFerias = item.ferias.length === 0;
        }

        return matchesBusca && matchesSaldo && matchesFerias;
      });
    }

    function renderCards() {
      const total = state.funcionarios.length;
      const comFerias = state.funcionarios.filter(item => item.ferias.length > 0).length;
      const saldoNegativo = state.funcionarios.filter(item => typeof item.saldo === "number" && item.saldo < 0).length;
      const periodos = state.funcionarios.reduce((acc, item) => acc + item.ferias.length, 0);

      el.cardsResumo.innerHTML = `
        <div class="card">
          <div class="label">Total de colaboradores</div>
          <div class="value">${total}</div>
          <div class="note">Base cadastrada no painel</div>
        </div>

        <div class="card">
          <div class="label">Com férias cadastradas</div>
          <div class="value">${comFerias}</div>
          <div class="note">Colaboradores com pelo menos um período</div>
        </div>

        <div class="card">
          <div class="label">Períodos lançados</div>
          <div class="value">${periodos}</div>
          <div class="note">Soma total dos lançamentos</div>
        </div>

        <div class="card">
          <div class="label">Saldo negativo</div>
          <div class="value">${saldoNegativo}</div>
          <div class="note">Pontos de atenção para gestão</div>
        </div>
      `;
    }

    function createVacationChip(vacation, employeeId) {
      const dias = diffDays(vacation.inicio, vacation.fim);
      const label = vacation.label || `${dias} dia${dias > 1 ? "s" : ""}`;

      return `
        <span class="chip" title="${formatDate(vacation.inicio)} até ${formatDate(vacation.fim)}">
          <span class="status-dot ${statusClass(vacation.status)}"></span>
          ${label} • ${formatDate(vacation.inicio)} → ${formatDate(vacation.fim)} • ${vacation.status}
          <button
            type="button"
            class="btn-sm btn-delete-inline"
            onclick="deleteVacation('${employeeId}', '${vacation.id}')"
          >
            Excluir
          </button>
          <button
            type="button"
            class="btn-sm btn-edit-inline"
            onclick="editVacation('${employeeId}', '${vacation.id}')"
          >
            Editar
          </button>
        </span>
      `;
    }

    function renderFuncionarios() {
      const lista = getFilteredFuncionarios();

      if (!lista.length) {
        el.tbodyFuncionarios.innerHTML = `
          <tr>
            <td colspan="6">
              <div class="empty-state">Nenhum funcionário encontrado com o filtro atual.</div>
            </td>
          </tr>
        `;
        return;
      }

      el.tbodyFuncionarios.innerHTML = lista.map(item => {
        const feriasHtml = item.ferias.length
          ? `<div class="chips">${item.ferias.map(v => createVacationChip(v, item.id)).join("")}</div>`
          : `<span style="color: var(--muted);">Sem férias cadastradas</span>`;

        const selectedClass = el.funcionarioFerias.value === item.id ? "selected-row" : "";

        return `
          <tr class="${selectedClass}">
            <td>
              <div class="employee-name">${item.nome}</div>
              <div class="employee-sub">
                Matrícula: ${item.matricula}${item.observacao ? ` • ${item.observacao}` : ""}
              </div>
            </td>

            <td>${item.supervisor}</td>
            <td>${formatDate(item.admissao)}</td>

            <td>
              <span class="badge ${saldoBadgeClass(item.saldo)}">
                ${formatSaldo(item.saldo)}
              </span>
            </td>

            <td>${feriasHtml}</td>

            <td>
              <div class="table-actions">
                <button
                  type="button"
                  class="btn-sm btn-add-inline"
                  onclick="selectEmployeeForVacation('${item.id}')"
                >
                  + Férias
                </button>

                <button
                  type="button"
                  class="btn-sm btn-edit-inline"
                  onclick="editEmployee('${item.id}')"
                >
                  Editar
                </button>

                <button
                  type="button"
                  class="btn-sm btn-delete-inline"
                  onclick="deleteEmployee('${item.id}')"
                >
                  Excluir
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }

    function getUpcomingVacations() {
      const all = [];
      const hoje = startOfDay(new Date());

      state.funcionarios.forEach(funcionario => {
        funcionario.ferias.forEach(ferias => {
          const start = parseDate(ferias.inicio);
          const end = parseDate(ferias.fim);
          if (!start || !end) return;

          if (end >= hoje) {
            all.push({
              funcionario,
              ferias,
              start
            });
          }
        });
      });

      return all.sort((a, b) => a.start - b.start);
    }

    function renderProximasFerias() {
      const upcoming = getUpcomingVacations();

      if (!upcoming.length) {
        el.proximasFerias.innerHTML = `<div class="empty-state">Nenhum período de férias cadastrado ainda.</div>`;
        return;
      }

      el.proximasFerias.innerHTML = upcoming.slice(0, 8).map(item => {
        const dias = diffDays(item.ferias.inicio, item.ferias.fim);

        return `
          <div class="agenda-card">
            <h4>${item.funcionario.nome}</h4>
            <div class="meta">${item.funcionario.supervisor} • Matrícula ${item.funcionario.matricula}</div>
            <div class="chips">
              <span class="pill">${formatDate(item.ferias.inicio)} → ${formatDate(item.ferias.fim)}</span>
              <span class="pill">${item.ferias.label || `${dias} dias`}</span>
              <span class="pill">${item.ferias.status}</span>
            </div>
          </div>
        `;
      }).join("");
    }

    function renderAlertasGestao() {
      const saldoNegativo = state.funcionarios.filter(
        item => typeof item.saldo === "number" && item.saldo < 0
      );

      const semFerias = state.funcionarios.filter(item => item.ferias.length === 0);

      const hoje = new Date();
      const feriasAtivas = [];

      state.funcionarios.forEach(funcionario => {
        funcionario.ferias.forEach(ferias => {
          const inicio = parseDate(ferias.inicio);
          const fim = parseDate(ferias.fim);

          if (inicio && fim && hoje >= inicio && hoje <= fim) {
            feriasAtivas.push({ funcionario, ferias });
          }
        });
      });

      const feriasProximas = getVacationsStartingSoon(ALERT_DAYS_BEFORE);

      el.alertasGestao.innerHTML = `
        <div class="agenda-card">
          <h4>Férias próximas</h4>
          <div class="meta">${feriasProximas.length} período(s) começando em até ${ALERT_DAYS_BEFORE} dias</div>
          ${
            feriasProximas.length
              ? `<div class="chips">
                  ${feriasProximas.map(item => `
                    <span class="chip">
                      <span class="status-dot" style="background: var(--amber)"></span>
                      ${
                        item.diasRestantes === 0
                          ? `${item.funcionario.nome} • começa hoje`
                          : item.diasRestantes === 1
                            ? `${item.funcionario.nome} • começa amanhã`
                            : `${item.funcionario.nome} • começa em ${item.diasRestantes} dias`
                      }
                    </span>
                  `).join("")}
                </div>`
              : `<div style="color: var(--muted);">Nenhum início de férias previsto para os próximos ${ALERT_DAYS_BEFORE} dias.</div>`
          }
        </div>

        <div class="agenda-card">
          <h4>Saldo negativo</h4>
          <div class="meta">${saldoNegativo.length} colaborador(es) com atenção imediata</div>
          ${
            saldoNegativo.length
              ? `<div class="chips">
                  ${saldoNegativo.map(item => `
                    <span class="chip">
                      <span class="status-dot" style="background: var(--red)"></span>
                      ${item.nome} • ${formatSaldo(item.saldo)}
                    </span>
                  `).join("")}
                </div>`
              : `<div style="color: var(--muted);">Nenhum caso encontrado.</div>`
          }
        </div>

        <div class="agenda-card">
          <h4>Sem férias cadastradas</h4>
          <div class="meta">${semFerias.length} colaborador(es) sem planejamento visível</div>
          ${
            semFerias.length
              ? `<div class="chips">
                  ${semFerias.slice(0, 8).map(item => `
                    <span class="chip">
                      <span class="status-dot" style="background:#64748b"></span>
                      ${item.nome}
                    </span>
                  `).join("")}
                </div>`
              : `<div style="color: var(--muted);">Todos têm ao menos um período cadastrado.</div>`
          }
        </div>

        <div class="agenda-card">
          <h4>Férias em andamento</h4>
          <div class="meta">${feriasAtivas.length} período(s) ativo(s) hoje</div>
          ${
            feriasAtivas.length
              ? `<div class="chips">
                  ${feriasAtivas.map(item => `
                    <span class="chip">
                      <span class="status-dot status-confirmado"></span>
                      ${item.funcionario.nome} • ${formatDate(item.ferias.inicio)} a ${formatDate(item.ferias.fim)}
                    </span>
                  `).join("")}
                </div>`
              : `<div style="color: var(--muted);">Nenhum período ativo no momento.</div>`
          }
        </div>
      `;
    }

    function renderAll() {
      renderCards();
      refreshFuncionarioSelect();
      renderFuncionarios();
      renderProximasFerias();
      renderAlertasGestao();
    }

    /* =========================
       FUNCIONÁRIO
    ========================= */
    function getEmployeeFormData() {
      return {
        nome: el.nome.value.trim(),
        matricula: el.matricula.value.trim(),
        supervisor: el.supervisor.value.trim(),
        admissao: el.admissao.value,
        saldo: safeNumber(el.saldo.value),
        observacao: el.observacao.value.trim()
      };
    }

    function validateEmployee(data) {
      if (!data.nome || !data.matricula || !data.supervisor) {
        alert("Preencha Nome, Matrícula e Supervisor.");
        return false;
      }

      const duplicated = state.funcionarios.some(
        item => item.matricula === data.matricula && item.id !== state.editandoId
      );

      if (duplicated) {
        alert("Já existe um funcionário com essa matrícula.");
        return false;
      }

      return true;
    }

    function handleEmployeeSubmit(event) {
      event.preventDefault();

      const data = getEmployeeFormData();
      if (!validateEmployee(data)) return;

      if (state.editandoId) {
        const index = state.funcionarios.findIndex(item => item.id === state.editandoId);
        if (index >= 0) {
          state.funcionarios[index] = {
            ...state.funcionarios[index],
            ...data
          };
        }
      } else {
        state.funcionarios.unshift({
          id: uid(),
          ...data,
          ferias: []
        });
      }

      applyAnniversaryCredits();
      saveData();
      clearEmployeeForm();
      renderAll();
      hideEmployeeForm();
    }

    /* =========================
       FÉRIAS
    ========================= */
    function handleVacationSubmit(event) {
      event.preventDefault();

      const funcionarioId = el.funcionarioFerias.value;
      const inicio = el.inicioFerias.value;
      const fim = el.fimFerias.value;
      const status = el.statusFerias.value;
      const label = el.labelFerias.value.trim();
      const observacao = el.obsFerias.value.trim();

      if (!funcionarioId) {
        alert("Selecione um funcionário.");
        return;
      }

      if (!inicio || !fim) {
        alert("Preencha a data inicial e final.");
        return;
      }

      if (parseDate(fim) < parseDate(inicio)) {
        alert("A data final não pode ser menor que a data inicial.");
        return;
      }

      const funcionario = state.funcionarios.find(item => item.id === funcionarioId);
      if (!funcionario) {
        alert("Funcionário não encontrado.");
        return;
      }

      const editing = state.editandoFerias;
      const diasFerias = diffDays(inicio, fim);
      const saldoAtual = typeof funcionario.saldo === "number" ? funcionario.saldo : 0;

      if (editing && editing.vacationId) {
        const vacation = funcionario.ferias.find(item => item.id === editing.vacationId);
        if (!vacation) {
          alert("Período de férias não encontrado para edição.");
          return;
        }

        const mesmaPeriodo = vacation.inicio === inicio && vacation.fim === fim;
        const duplicatedVacation = funcionario.ferias.some(
          item => item.id !== vacation.id && item.inicio === inicio && item.fim === fim
        );

        if (duplicatedVacation) {
          alert("Já existe outro período com as mesmas datas para este funcionário.");
          return;
        }

        const diasAntigos = diffDays(vacation.inicio, vacation.fim);
        const diferencaDias = diasFerias - diasAntigos;

        if (diferencaDias > 0 && saldoAtual < diferencaDias) {
          alert(`O saldo está insuficiente para alterar o período. O funcionário ficará com saldo negativo de ${formatSaldo(saldoAtual - diferencaDias)}.`);
        }

        vacation.inicio = inicio;
        vacation.fim = fim;
        vacation.status = status;
        vacation.label = label;
        vacation.observacao = observacao;

        funcionario.saldo = saldoAtual - diferencaDias;
        funcionario.ferias.sort((a, b) => parseDate(a.inicio) - parseDate(b.inicio));
      } else {
        const duplicatedVacation = funcionario.ferias.some(
          item => item.inicio === inicio && item.fim === fim
        );

        if (duplicatedVacation) {
          alert("Este período de férias já está cadastrado para este funcionário.");
          return;
        }

        if (saldoAtual < diasFerias) {
          alert(`O saldo está insuficiente para lançar ${diasFerias} dias de férias. O funcionário ficará com saldo negativo de ${formatSaldo(saldoAtual - diasFerias)}.`);
        }

        funcionario.ferias.push({
          id: uid(),
          inicio,
          fim,
          status,
          label,
          observacao
        });

        funcionario.saldo = saldoAtual - diasFerias;
        funcionario.ferias.sort((a, b) => parseDate(a.inicio) - parseDate(b.inicio));
      }

      if (state.editandoId === funcionarioId) {
        el.saldo.value = funcionario.saldo ?? "";
      }

      saveData();
      clearVacationForm();
      el.funcionarioFerias.value = funcionarioId;
      updateSelectedEmployeeLabel();
      renderAll();
      notifyUpcomingVacations();
      hideVacationForm();
    }

    /* =========================
       AÇÕES GLOBAIS
    ========================= */
    window.editEmployee = function(id) {
      const funcionario = state.funcionarios.find(item => item.id === id);
      if (!funcionario) return;

      showEmployeeForm();

      state.editandoId = id;
      el.nome.value = funcionario.nome;
      el.matricula.value = funcionario.matricula;
      el.supervisor.value = funcionario.supervisor;
      el.admissao.value = funcionario.admissao || "";
      el.saldo.value = funcionario.saldo ?? "";
      el.observacao.value = funcionario.observacao || "";

      el.tituloFormulario.textContent = "Editar funcionário";
      el.statusEdicao.textContent = "Modo edição";
      el.btnSalvarFuncionario.textContent = "Atualizar funcionário";
      el.btnCancelarEdicao.style.display = "inline-flex";

      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.deleteEmployee = function(id) {
      const funcionario = state.funcionarios.find(item => item.id === id);
      if (!funcionario) return;

      const ok = confirm(`Excluir ${funcionario.nome}? Todos os períodos de férias desse cadastro também serão removidos.`);
      if (!ok) return;

      state.funcionarios = state.funcionarios.filter(item => item.id !== id);

      if (state.editandoId === id) {
        clearEmployeeForm();
      }

      if (el.funcionarioFerias.value === id) {
        clearVacationForm();
      }

      saveData();
      renderAll();
    };

    window.selectEmployeeForVacation = function(id) {
      const funcionario = state.funcionarios.find(item => item.id === id);
      if (!funcionario) return;

      clearVacationForm();
      showVacationForm();
      el.funcionarioFerias.value = id;
      updateSelectedEmployeeLabel();
      renderFuncionarios();

      setTimeout(() => {
        el.inicioFerias.focus();
      }, 100);
    };

    window.editVacation = function(employeeId, vacationId) {
      const funcionario = state.funcionarios.find(item => item.id === employeeId);
      if (!funcionario) return;

      const vacation = funcionario.ferias.find(item => item.id === vacationId);
      if (!vacation) return;

      state.editandoFerias = { employeeId, vacationId };
      showVacationForm();
      el.funcionarioFerias.value = employeeId;
      el.funcionarioFerias.disabled = true;
      el.inicioFerias.value = vacation.inicio;
      el.fimFerias.value = vacation.fim;
      el.statusFerias.value = vacation.status;
      el.labelFerias.value = vacation.label;
      el.obsFerias.value = vacation.observacao;
      el.btnSalvarFerias.textContent = "Atualizar férias";
      updateSelectedEmployeeLabel();
      renderFuncionarios();

      setTimeout(() => {
        el.inicioFerias.focus();
      }, 100);
    };

    window.deleteVacation = function(employeeId, vacationId) {
      const funcionario = state.funcionarios.find(item => item.id === employeeId);
      if (!funcionario) return;

      const ferias = funcionario.ferias.find(item => item.id === vacationId);
      if (!ferias) return;

      const ok = confirm(`Excluir o período de ${formatDate(ferias.inicio)} até ${formatDate(ferias.fim)} de ${funcionario.nome}?`);
      if (!ok) return;

      const diasFerias = diffDays(ferias.inicio, ferias.fim);
      funcionario.saldo = (typeof funcionario.saldo === "number" ? funcionario.saldo : 0) + diasFerias;
      funcionario.ferias = funcionario.ferias.filter(item => item.id !== vacationId);

      if (state.editandoId === employeeId) {
        el.saldo.value = funcionario.saldo ?? "";
      }

      saveData();
      renderAll();
    };

    function clearAllData() {
      const ok = confirm("Tem certeza que deseja apagar todos os dados salvos neste navegador?");
      if (!ok) return;

      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ALERT_STORAGE_KEY);

      state.funcionarios = [];
      state.editandoId = null;

      clearEmployeeForm();
      clearVacationForm();

      hideEmployeeForm();
      hideVacationForm();

      renderAll();
    }

    /* =========================
       EVENTOS
    ========================= */
    el.btnToggleForms.addEventListener("click", toggleForms);

    el.btnOpenEmployeeForm.addEventListener("click", () => {
      const willOpen = el.employeeFormPanel.style.display === "none";

      if (willOpen && !state.editandoId) {
        clearEmployeeForm();
      }

      toggleEmployeeForm();
    });

    el.btnOpenVacationForm.addEventListener("click", () => {
      const willOpen = el.vacationFormPanel.style.display === "none";

      if (willOpen) {
        clearVacationForm();
      }

      toggleVacationForm();
    });

    el.btnCloseEmployeeForm.addEventListener("click", hideEmployeeForm);
    el.btnCloseVacationForm.addEventListener("click", hideVacationForm);

    el.formFuncionario.addEventListener("submit", handleEmployeeSubmit);
    el.formFerias.addEventListener("submit", handleVacationSubmit);

    el.btnCancelarEdicao.addEventListener("click", () => {
      clearEmployeeForm();
      hideEmployeeForm();
    });

    el.btnLimparFerias.addEventListener("click", clearVacationForm);
    el.btnClearAllData.addEventListener("click", clearAllData);

    el.btnExportJson.addEventListener("click", exportDataAsJson);

    el.btnImportJson.addEventListener("click", () => {
      el.importJsonFile.click();
    });

    el.importJsonFile.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const total = await importDataFromJsonFile(file);
        renderAll();
        notifyUpcomingVacations();
        alert(`Importação concluída com sucesso. ${total} registro(s) lido(s) do arquivo.`);
      } catch (error) {
        console.error(error);
        alert("Erro ao importar JSON. Verifique se o arquivo é válido.");
      } finally {
        event.target.value = "";
      }
    });

    el.busca.addEventListener("input", () => {
      state.busca = el.busca.value;
      renderFuncionarios();
    });

    el.filtroSaldo.addEventListener("change", () => {
      state.filtroSaldo = el.filtroSaldo.value;
      renderFuncionarios();
    });

    el.filtroFerias.addEventListener("change", () => {
      state.filtroFerias = el.filtroFerias.value;
      renderFuncionarios();
    });

    el.funcionarioFerias.addEventListener("change", () => {
      updateSelectedEmployeeLabel();
      renderFuncionarios();
    });

    /* =========================
       INICIALIZAÇÃO
    ========================= */
    loadData();
    el.formsWrap.classList.add("hidden");
    el.employeeFormPanel.style.display = "none";
    el.vacationFormPanel.style.display = "none";
    el.btnToggleForms.textContent = "Mostrar cadastros";
    renderAll();
    notifyUpcomingVacations();
