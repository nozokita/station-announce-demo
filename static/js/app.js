(function () {
  const STORAGE_KEY = "station_announce_mock_session";
  const DEMO_PASSWORD = "demo";
  let audioEnabled = false;

  /**
   * iOS Safari では、ユーザージェスチャ（タップ）で play() された
   * 同一の Audio 要素だけが以降も play() を許可される。
   * そこで1つの Audio を使い回し、src を差し替えて連続再生する。
   */
  let sharedAudio = null;
  let globalPlayId = 0;

  function stopCurrentPlayback() {
    globalPlayId++;
    if (sharedAudio) {
      try {
        sharedAudio.pause();
        sharedAudio.removeAttribute("src");
        sharedAudio.load();
      } catch (_) {}
    }
  }

  /**
   * sharedAudio を1曲再生して resolved する Promise。
   * myId が古くなったらキャンセル扱い。
   */
  function playSingleFile(url, myId) {
    return new Promise((resolve) => {
      if (!url || myId !== globalPlayId) return resolve(false);

      const audio = sharedAudio;
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
        resolve(ok);
      };
      const onEnded = () => finish(true);
      const onError = () => finish(false);
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("error", onError);
      audio.src = url;
      audio.load();
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => finish(false));
      }
    });
  }

  function sleep(ms, myId) {
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(myId === globalPlayId), ms);
      const check = setInterval(() => {
        if (myId !== globalPlayId) {
          clearTimeout(t);
          clearInterval(check);
          resolve(false);
        }
      }, 100);
      setTimeout(() => clearInterval(check), ms + 50);
    });
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveSession(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function stationById(id) {
    return MOCK.stations.find((s) => s.id === id);
  }

  function broadcastById(id) {
    return MOCK.broadcasts.find((b) => b.id === id);
  }

  function toast(msg) {
    const area = $("#toast-area");
    if (!area) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    area.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function showLogin() {
    $("#login-page").hidden = false;
    $("#app-shell").hidden = true;
  }

  function showApp() {
    $("#login-page").hidden = true;
    $("#app-shell").hidden = false;
    const s = loadSession();
    $$(".nav-item.admin-only").forEach((el) => {
      el.classList.toggle("hidden", s.role !== "admin");
    });
    $("#nav-user-label").textContent =
      s.role === "admin"
        ? `${s.username}（管理者・全駅）`
        : `${s.username}（${stationById(s.station_id)?.name ?? "駅未設定"}）`;
    renderMain();
    renderSchedules();
    renderLogs();
    renderUsers();
    renderStations();
  }

  function navigate(viewId) {
    $$(".view").forEach((v) => v.classList.remove("active"));
    const v = document.getElementById("view-" + viewId);
    if (v) v.classList.add("active");
    $$(".nav-item").forEach((n) => n.classList.remove("active"));
    const nav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (nav) nav.classList.add("active");
  }

  function visibleBroadcastsForStation(stationId) {
    return MOCK.broadcasts.filter((b) => {
      if (b.is_deleted) return false;
      if (b.station_id === null) return true;
      return b.station_id === stationId;
    });
  }

  function favoritesForStation(stationId) {
    return MOCK.favorites
      .filter((f) => f.station_id === stationId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f) => broadcastById(f.broadcast_id))
      .filter(Boolean)
      .filter((b) => !b.is_deleted && visibleBroadcastsForStation(stationId).includes(b));
  }

  function renderMain(explicitStationId) {
    const s = loadSession();
    const sel = $("#main-station");
    const activeStations = MOCK.stations.filter((x) => x.is_active);
    // 選択済み駅IDを優先して反映
    const currentId =
      explicitStationId ||
      Number(sel.value) ||
      s.station_id ||
      (activeStations[0] && activeStations[0].id);

    sel.innerHTML = "";
    activeStations.forEach((st) => {
      const o = document.createElement("option");
      o.value = String(st.id);
      o.textContent = `${st.name}`;
      sel.appendChild(o);
    });
    if (currentId) sel.value = String(currentId);

    const stationId = Number(sel.value);
    const favContainer = $("#favorites-list");
    const allContainer = $("#all-broadcasts-list");
    favContainer.innerHTML = "";
    allContainer.innerHTML = "";

    const favs = favoritesForStation(stationId);
    if (favs.length === 0) {
      favContainer.innerHTML =
        '<p class="meta" style="margin:0">お気に入りは未登録です（モック）。</p>';
    } else {
      favs.forEach((b) => favContainer.appendChild(broadcastCard(b, stationId)));
    }

    const all = visibleBroadcastsForStation(stationId);
    all.forEach((b) => allContainer.appendChild(broadcastCard(b, stationId)));

    sel.onchange = () => renderMain(Number(sel.value));
  }

  function broadcastCard(b, stationId) {
    const card = document.createElement("div");
    const stationFavs = favoritesForStation(stationId);
    const isFav = stationFavs.includes(b);
    card.className = "card" + (isFav ? " favorite" : "");
    const scope =
      b.station_id === null ? "全駅共通" : `${stationById(b.station_id)?.name ?? ""}専用`;
    card.innerHTML = `
      <h3>${escapeHtml(b.title)}</h3>
      <div class="meta">
        ${escapeHtml(scope)}
      </div>
      <div class="preview">${escapeHtml(b.text_ja)}</div>
      <div class="card-actions">
        <button type="button" class="btn btn-ghost btn-sm fav-toggle" data-bid="${b.id}">
          ${isFav ? "★ お気に入り" : "☆ お気に入り"}
        </button>
        <select class="lang-select" data-bid="${b.id}">
          <option value="ja">日本語のみ</option>
          <option value="all">全言語順（JA→EN→KO→ZH、間に1秒無音・モック）</option>
        </select>
        <button type="button" class="btn btn-primary btn-sm btn-play" data-bid="${b.id}">放送</button>
      </div>
    `;
    $(".btn-play", card).addEventListener("click", () => {
      const lang = $(".lang-select", card).value;
      playMock(b, lang);
    });

    $(".fav-toggle", card).addEventListener("click", () => {
      if (!stationId) {
        toast("駅が選択されているときのみお気に入りを変更できます");
        return;
      }
      const idx = MOCK.favorites.findIndex(
        (f) => f.station_id === stationId && f.broadcast_id === b.id,
      );
      if (idx === -1) {
        const maxOrder = MOCK.favorites
          .filter((f) => f.station_id === stationId)
          .reduce((m, f) => Math.max(m, f.sort_order ?? 0), 0);
        MOCK.favorites.push({
          station_id: stationId,
          broadcast_id: b.id,
          sort_order: maxOrder + 1,
        });
        toast("お気に入りに追加しました（モック）");
      } else {
        MOCK.favorites.splice(idx, 1);
        toast("お気に入りから削除しました（モック）");
      }
      renderMain(stationId);
    });
    return card;
  }

  function playMock(b, lang) {
    if (!audioEnabled) {
      toast("音声を有効にしてください（仕様 4.2 ①）");
      return;
    }

    stopCurrentPlayback();

    if (!sharedAudio) {
      sharedAudio = new Audio();
    }

    const myId = globalPlayId;

    const urls =
      lang === "all"
        ? [b.audio_ja, b.audio_en, b.audio_ko, b.audio_zh]
        : [b.audio_ja];

    const label =
      lang === "all"
        ? `再生（全言語順）: ${b.title}`
        : `再生: ${b.title}`;
    toast(label);

    /** 1曲目だけ同期で src + play（iOS ジェスチャ解除に必須） */
    sharedAudio.src = urls[0] || "";
    sharedAudio.load();
    const firstPlay = sharedAudio.play();
    if (firstPlay && typeof firstPlay.catch === "function") {
      firstPlay.catch(() => {
        if (myId === globalPlayId) toast("再生できませんでした");
      });
    }

    /** 1曲目の ended を待ち、2曲目以降を同じ要素で再生 */
    void (async () => {
      const firstOk = await new Promise((resolve) => {
        if (myId !== globalPlayId) return resolve(false);
        const audio = sharedAudio;
        const onEnd = () => { audio.removeEventListener("error", onErr); resolve(true); };
        const onErr = () => { audio.removeEventListener("ended", onEnd); resolve(false); };
        audio.addEventListener("ended", onEnd, { once: true });
        audio.addEventListener("error", onErr, { once: true });
      });
      if (!firstOk || myId !== globalPlayId) return;

      for (let i = 1; i < urls.length; i++) {
        if (myId !== globalPlayId) return;
        const waited = await sleep(1000, myId);
        if (!waited) return;
        const played = await playSingleFile(urls[i], myId);
        if (!played || myId !== globalPlayId) return;
      }

      if (myId !== globalPlayId) return;

      const s = loadSession();
      const logStation =
        s.role === "admin" ? Number($("#main-station")?.value) : s.station_id;

      MOCK.logs.unshift({
        id: Date.now(),
        station_id: logStation || null,
        broadcast_id: b.id,
        schedule_id: null,
        played_at: new Date().toISOString(),
        status: "success",
      });
      renderLogs();
    })();
  }

  function escapeHtml(t) {
    if (!t) return "";
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
  }

  function renderSchedules() {
    const tbody = $("#schedules-tbody");
    const filterSel = $("#sch-station-filter");

    // フィルタ用プルダウンを初期化
    if (filterSel && !filterSel.dataset._initialized) {
      const activeStations = MOCK.stations.filter((s) => s.is_active);
      filterSel.innerHTML = '<option value="">全駅</option>';
      activeStations.forEach((st) => {
        const o = document.createElement("option");
        o.value = String(st.id);
        o.textContent = st.name;
        filterSel.appendChild(o);
      });
      filterSel.dataset._initialized = "1";
      filterSel.addEventListener("change", () => renderSchedules());
    }

    const selectedStationId =
      filterSel && filterSel.value ? Number(filterSel.value) : null;

    tbody.innerHTML = "";
    MOCK.schedules
      .filter((sch) => (selectedStationId == null ? true : sch.station_id === selectedStationId))
      .forEach((sch) => {
      const st = stationById(sch.station_id);
      const br = broadcastById(sch.broadcast_id);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(st?.name ?? "")}</td>
        <td>${escapeHtml(br?.title ?? "（削除済み）")}</td>
        <td>${sch.schedule_type}</td>
        <td>${escapeHtml(scheduleSummary(sch))}</td>
        <td><span class="badge ${sch.is_active ? "badge-success" : "badge-missed"}">${sch.is_active ? "有効" : "無効"}</span></td>
        <td>
          <button type="button" class="btn btn-ghost btn-sm toggle-sch" data-id="${sch.id}">有効/無効 切替</button>
          <button type="button" class="btn btn-ghost btn-sm delete-sch" data-id="${sch.id}">削除（モック）</button>
        </td>
      `;
      $(".toggle-sch", tr).addEventListener("click", () => {
        sch.is_active = !sch.is_active;
        renderSchedules();
        toast("スケジュール有効/無効を切り替えました（モック・メモリのみ）");
      });
      $(".delete-sch", tr).addEventListener("click", () => {
        const idx = MOCK.schedules.findIndex((s) => s.id === sch.id);
        if (idx !== -1) {
          MOCK.schedules.splice(idx, 1);
          renderSchedules();
          toast("スケジュールを削除しました（モック・メモリのみ）");
        }
      });
      tbody.appendChild(tr);
    });

    const bcSel = $("#sch-broadcast");
    bcSel.innerHTML = "";
    MOCK.broadcasts
      .filter((b) => !b.is_deleted)
      .forEach((b) => {
        const o = document.createElement("option");
        o.value = String(b.id);
        o.textContent = b.title;
        bcSel.appendChild(o);
      });

    updateScheduleFormFields();
  }

  function scheduleSummary(sch) {
    if (sch.schedule_type === "once") return sch.once_at || "—";
    if (sch.schedule_type === "interval")
      return `${sch.interval_min ?? "—"}分ごと（基準 ${sch.time_of_day ?? "—"}）`;
    return "—";
  }

  function toggleWeekdaysAll(containerId, weekdaysOnly) {
    const row = document.getElementById(containerId);
    if (!row) return;
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const target = weekdaysOnly ? days.slice(0, 5) : days.slice(5);
    row.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      if (target.includes(cb.value)) cb.checked = true;
    });
  }

  function updateScheduleFormFields() {
    const type = $("#sch-type").value;
    $("#grp-once").style.display = type === "once" ? "block" : "none";
    $("#grp-interval").style.display = type === "interval" ? "block" : "none";
    $("#grp-period").style.display = type === "once" ? "none" : "block";
  }

  function renderLogs() {
    const s = loadSession();
    const tbody = $("#logs-tbody");
    tbody.innerHTML = "";
    const filter = $("#log-date").value;
    MOCK.logs
      .filter((log) => {
        if (s.role !== "admin" && log.station_id !== s.station_id) return false;
        if (!filter) return true;
        return log.played_at.slice(0, 10) === filter;
      })
      .forEach((log) => {
        const st = stationById(log.station_id);
        const br = broadcastById(log.broadcast_id);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(st?.name ?? "")}</td>
          <td>${br ? escapeHtml(br.title) : "（削除済み）"}</td>
          <td>${log.played_at.replace("T", " ").slice(0, 19)} JST相当</td>
          <td><span class="badge ${log.status === "success" ? "badge-success" : "badge-missed"}">${log.status}</span></td>
        `;
        tbody.appendChild(tr);
      });
  }

  function renderUsers() {
    const tbody = $("#users-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    MOCK.users.forEach((u) => {
      const st = u.station_id ? stationById(u.station_id) : null;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(u.username)}</td>
        <td><span class="badge badge-admin">${u.role}</span></td>
        <td>${u.station_id == null ? "全駅" : escapeHtml(st?.name ?? "")}</td>
        <td>
          <button type="button" class="btn btn-ghost btn-sm user-edit" data-id="${u.id}">編集（モック）</button>
          <button type="button" class="btn btn-ghost btn-sm user-delete" data-id="${u.id}">削除（モック）</button>
        </td>
      `;
      $(".user-edit", tr).addEventListener("click", () => {
        toast("ユーザー編集ダイアログ（モック）: 実装時にフォームを追加");
      });
      $(".user-delete", tr).addEventListener("click", () => {
        const idx = MOCK.users.findIndex((x) => x.id === u.id);
        if (idx !== -1) {
          MOCK.users.splice(idx, 1);
          renderUsers();
          toast("ユーザーを削除しました（モック・メモリのみ）");
        }
      });
      tbody.appendChild(tr);
    });
  }

  function renderStations() {
    const tbody = $("#stations-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    MOCK.stations.forEach((st) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(st.name)}</td>
        <td>${st.is_active ? "有効" : "無効"}</td>
        <td>
          <button type="button" class="btn btn-ghost btn-sm station-edit" data-id="${st.id}">編集（モック）</button>
          <button type="button" class="btn btn-ghost btn-sm station-delete" data-id="${st.id}">削除（モック）</button>
        </td>
      `;
      $(".station-edit", tr).addEventListener("click", () => {
        toast("駅編集ダイアログ（モック）: 実装時にフォームを追加");
      });
      $(".station-delete", tr).addEventListener("click", () => {
        const idx = MOCK.stations.findIndex((x) => x.id === st.id);
        if (idx !== -1) {
          MOCK.stations.splice(idx, 1);
          renderStations();
          toast("駅を削除しました（モック・メモリのみ）");
        }
      });
      tbody.appendChild(tr);
    });
  }

  function setWsState(connected) {
    const pill = $("#ws-pill");
    const banner = $("#alert-banner");
    pill.classList.toggle("disconnected", !connected);
    pill.querySelector("span:last-child").textContent = connected
      ? "WSS 接続中（モック）"
      : "WSS 切断（モック）";
    banner.classList.toggle("visible", !connected);
  }

  function bindLogin() {
    $("#form-login").addEventListener("submit", (e) => {
      e.preventDefault();
      const username = $("#login-user").value.trim();
      const password = $("#login-pass").value;
      const u = MOCK.users.find((x) => x.username === username);
      if (!u || password !== DEMO_PASSWORD) {
        toast("ログイン失敗");
        return;
      }
      saveSession({ username: u.username, role: u.role, station_id: u.station_id });
      $("#audio-enable").classList.add("visible");
      showApp();
      navigate("main");
      toast(`ようこそ、${u.username} さん`);
    });
  }

  function bindNav() {
    $$(".nav-item[data-view]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const view = el.getAttribute("data-view");
        if (el.classList.contains("admin-only") && loadSession()?.role !== "admin") return;
        navigate(view);
      });
    });
    $("#btn-logout").addEventListener("click", () => {
      clearSession();
      showLogin();
      toast("ログアウトしました");
    });
  }

  function bindBroadcastEdit() {
    $("#btn-translate").addEventListener("click", () => {
      const ja = $("#edit-text-ja").value.trim();
      if (!ja) {
        toast("日本語テキストを入力してください");
        return;
      }
      $("#edit-text-en").value =
        "[Translate mock] " + ja.slice(0, 40) + (ja.length > 40 ? "…" : "");
      $("#edit-text-ko").value = "[번역 모의] " + ja.slice(0, 30);
      $("#edit-text-zh").value = "[翻译模拟] " + ja.slice(0, 30);
      toast("Amazon Translate 呼出しを模擬しました");
    });
    $("#btn-tts").addEventListener("click", () => {
      toast("Polly で4言語 MP3 生成 → S3 保存を模擬しました");
    });
    $$(".btn-preview").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lang = btn.getAttribute("data-lang");
        toast(`試聴（モック）: ${lang} Neural 女性音声`);
      });
    });

    $("#btn-broadcast-save").addEventListener("click", () => {
      const scope = $("#edit-station-scope").value;
      const title = $("#edit-title").value.trim();
      const ja = $("#edit-text-ja").value.trim();
      const en = $("#edit-text-en").value.trim();
      const ko = $("#edit-text-ko").value.trim();
      const zh = $("#edit-text-zh").value.trim();

      if (!title || !ja) {
        toast("タイトルと日本語テキストを入力してください");
        return;
      }

      const stationId = scope === "" ? null : Number(scope);
      const maxId = MOCK.broadcasts.reduce((m, b) => Math.max(m, b.id), 0);
      const newBroadcast = {
        id: maxId + 1,
        station_id: stationId,
        title,
        text_ja: ja,
        text_en: en || null,
        text_ko: ko || null,
        text_zh: zh || null,
        audio_ja: "audio/transport-ja.mp3",
        audio_en: "audio/transport-en.mp3",
        audio_ko: "audio/transport-ko.mp3",
        audio_zh: "audio/transport-zh.mp3",
        is_deleted: false,
      };

      MOCK.broadcasts.push(newBroadcast);
      toast("放送文を登録しました（モック: メモリのみ）");

      const currentStationId = Number($("#main-station")?.value) || stationId || null;
      if (currentStationId != null) {
        renderMain(currentStationId);
      } else {
        renderMain();
      }
    });
  }

  function bindScheduleForm() {
    $("#sch-type").addEventListener("change", updateScheduleFormFields);
    $("#form-schedule").addEventListener("submit", (e) => {
      e.preventDefault();
      toast("スケジュール追加（モック・未保存）: 実装時は API に POST");
    });

    // 曜日補助ボタン（interval 用）
    $("#btn-int-weekdays-all")?.addEventListener("click", () =>
      toggleWeekdaysAll("interval-days-row", true),
    );
    $("#btn-int-weekend-all")?.addEventListener("click", () =>
      toggleWeekdaysAll("interval-days-row", false),
    );
  }

  function bindDemoWs() {
    $("#demo-ws-fail").addEventListener("change", (e) => {
      setWsState(!e.target.checked);
    });
    setWsState(true);
  }

  function bindAudioEnable() {
    $("#btn-audio-enable").addEventListener("click", () => {
      $("#audio-enable").classList.remove("visible");
      audioEnabled = true;
      if (!sharedAudio) sharedAudio = new Audio();
      toast("音声を有効にしました（仕様: ユーザー操作で有効化）");
    });
  }

  function init() {
    bindLogin();
    bindNav();
    bindBroadcastEdit();
    bindScheduleForm();
    bindDemoWs();
    bindAudioEnable();
    $("#log-date").addEventListener("change", renderLogs);

    const s = loadSession();
    if (s) {
      showApp();
      navigate("main");
    } else {
      showLogin();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
