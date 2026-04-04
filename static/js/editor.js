/* ========================================
   Notely - Editor Module
   Quill editor, settings modal, first-launch
   overlay, DB config, and Bootstrap.
   ======================================== */

(function() {
  "use strict";

  var $ = function(s) { return document.querySelector(s); };

  /* === DOM refs === */
  var sidebar          = $("#sidebar");
  var welcome          = $("#welcome");
  var editorCard       = $("#editor-card");
  var inpTitle         = $("#inp-title");
  var btnDelEditor     = $("#btn-del-editor");
  var btnNew           = $("#btn-new");
  var btnSave          = $("#btn-save");
  var btnClear         = $("#btn-clear");
  var btnSettings      = $("#btn-settings");
  var btnSettingsCancel = $("#btn-settings-cancel");
  var btnSettingsSave  = $("#btn-settings-save");
  var btnBrowseSettings = $("#btn-browse-settings");
  var settingsModal    = $("#settings-modal");
  var settingsPathInput = $("#settings-path-input");
  var settingsCreateNew = $("#settings-create-new");
  var settingsCurrentPath = $("#settings-current-path");
  var settingsError    = $("#settings-error");
  var firstLaunchOv    = $("#first-launch-overlay");
  var firstLaunchPathInput = $("#first-launch-path-input");
  var firstLaunchError = $("#first-launch-error");
  var firstLaunchHint = $("#first-launch-hint");
  var firstLaunchLabel = $("#first-launch-label");
  var btnFirstLaunchConnect = $("#btn-first-launch-connect");
  var btnBrowseFirstLaunch = $("#btn-browse-first-launch");
  var toggleFile = $("#toggle-file");
  var toggleFolder = $("#toggle-folder");
  var firstLaunchBrowseMode = { current: "file" };

  /* === State === */
  var editingId = null;
  var editingFolderId = null;
  var currentDbPath = null;
  var quill = null;

  /* === Init Quill === */
  function initQuill() {
    if (quill) return;
    var container = document.getElementById("quill-editor");
    if (!container) { console.error("#quill-editor not found"); return; }
    container.innerHTML = "";
    try {
      quill = new Quill(container, {
        theme: "snow",
        placeholder: "Write your note here\u2026",
        modules: {
          toolbar: [
            ["bold", "italic", "underline", "strike"],
            [{ size: ["small", "normal", "large"] }],
            [{ color: [] }],
            [{ list: "ordered" }, { list: "bullet" }],
            ["blockquote", "code-block"],
            ["link", "clean"]
          ]
        }
      });
      quill.root.style.position = "relative";
    } catch (e) {
      console.error("Quill init failed:", e);
      container.innerHTML = "";
      quill = null;
    }
  }

  /* === Show editor / welcome === */
  function showEditor(note) {
    welcome.classList.remove("visible");
    editorCard.classList.add("visible");
    initQuill();
    if (note) {
      editingId = note.id;
      inpTitle.value = note.title;
      try {
        quill.clipboard.dangerouslyPasteHTML(note.content || "");
      } catch (e) {
        console.error("Failed to load note content, falling back to plain text:", e);
        quill.setText("");
      }
      btnDelEditor.style.display = "";
      NotelySidebar.renderAll();
    } else {
      editingId = null;
      editingFolderId = NotelySidebar.getActiveFolderId();
      inpTitle.value = "";
      if (quill) quill.setText("");
      btnDelEditor.style.display = "none";
      NotelySidebar.renderAll();
    }
    inpTitle.focus();
  }

  function showWelcome() {
    welcome.classList.add("visible");
    editorCard.classList.remove("visible");
    editingId = null;
    NotelySidebar.renderAll();
  }

  /* === Load helpers === */
  function loadNotes(callback) {
    NotelyApi.listNotes().then(function(notes) {
      NotelySidebar.setNotes(notes);
      if (typeof callback === "function") callback();
    }).catch(function(err) {
      console.error("Failed to load notes:", err);
    });
  }

  function loadFolders(callback) {
    NotelyApi.listFolders().then(function(folders) {
      NotelySidebar.setFolders(folders);
      if (typeof callback === "function") callback();
    }).catch(function(err) {
      console.error("Failed to load folders:", err);
    });
  }

  /* === DB config === */
  function showError(el, msg) {
    el.textContent = msg;
    el.style.display = "block";
  }

  function hideError(el) {
    el.style.display = "none";
  }

  function connectDb(path, errorEl, onSuccess) {
    if (!path) {
      showError(errorEl, "Please enter a path.");
      return;
    }
    hideError(errorEl);
    NotelyApi.setConfig(path).then(function(result) {
      if (!result.ok) {
        showError(errorEl, result.data.error || "Failed to connect.");
        return;
      }
      currentDbPath = result.data.db_path || path;
      hideFirstLaunchOverlay();
      hideSettingsModal();
      showMainButtons();
      loadFolders();
      loadNotes();
      if (onSuccess) onSuccess();
    }).catch(function(err) {
      showError(errorEl, "Network error: " + err.message);
    });
  }

  function showFirstLaunchOverlay() {
    firstLaunchOv.classList.add("open");
    firstLaunchPathInput.focus();
  }

  function hideFirstLaunchOverlay() {
    firstLaunchOv.classList.remove("open");
  }

  function showSettingsModal() {
    settingsModal.classList.add("open");
    settingsCurrentPath.textContent = currentDbPath || "Not configured";
    settingsPathInput.value = "";
    hideError(settingsError);
    settingsCreateNew.checked = true;
  }

  function hideSettingsModal() {
    settingsModal.classList.remove("open");
  }

  /* === Browse wrapper === */
  function browseFolder(inputEl, errorEl) {
    inputEl.disabled = true;
    NotelyApi.browseFile().then(function(result) {
      if (result.cancelled) return;
      if (result.error) {
        showError(errorEl, result.error);
        return;
      }
      inputEl.value = result.path;
    }).catch(function(err) {
      showError(errorEl, "Browse failed: " + err.message);
    }).finally(function() {
      inputEl.disabled = false;
    });
  }

  function browseFolderPath(inputEl, errorEl) {
    inputEl.disabled = true;
    NotelyApi.browseFolder().then(function(result) {
      if (result.cancelled) return;
      if (result.error) {
        showError(errorEl, result.error);
        return;
      }
      inputEl.value = result.path;
    }).catch(function(err) {
      showError(errorEl, "Browse failed: " + err.message);
    }).finally(function() {
      inputEl.disabled = false;
    });
  }

  /* === Event Listeners === */

  /* Save */
  btnSave.addEventListener("click", function() {
    var content = quill.root.innerHTML;
    var body = { title: inpTitle.value, content: content, folder_id: NotelySidebar.getActiveFolderId() };
    if (editingId) {
      NotelyApi.updateNote(editingId, body).then(function(saved) {
        editingId = saved.id;
        inpTitle.value = saved.title;
        loadNotes();
      }).catch(function(err) { console.error("Failed to save note:", err); });
    } else {
      NotelyApi.saveNote(body).then(function(saved) {
        editingId = saved.id;
        inpTitle.value = saved.title;
        loadNotes();
      }).catch(function(err) { console.error("Failed to create note:", err); });
    }
  });

  /* New note */
  btnNew.addEventListener("click", function() { showEditor(null); });
  /* Clear */
  btnClear.addEventListener("click", function() { showEditor(null); });

  /* Delete note */
  btnDelEditor.addEventListener("click", function() {
    if (!editingId) return;
    if (!confirm("Delete this note?")) return;
    NotelyApi.deleteNote(editingId).then(function() {
      showWelcome();
      loadNotes();
    }).catch(function(err) { console.error("Failed to delete note:", err); });
  });

  /* Settings open / close */
  btnSettings.addEventListener("click", showSettingsModal);
  btnSettingsCancel.addEventListener("click", hideSettingsModal);
  settingsModal.addEventListener("click", function(e) {
    if (e.target === settingsModal) hideSettingsModal();
  });
  btnSettingsSave.addEventListener("click", function() {
    connectDb(settingsPathInput.value.trim(), settingsError, function() {
      settingsCurrentPath.textContent = currentDbPath;
    });
  });
  settingsPathInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") btnSettingsSave.click();
  });
  btnBrowseSettings.addEventListener("click", function() {
    browseFolder(settingsPathInput, settingsError);
  });

  /* === DB Config check on startup === */
  function checkConfig() {
    NotelyApi.getConfig().then(function(cfg) {
      currentDbPath = cfg.db_path || null;
      if (!cfg.configured) {
        updateFirstLaunchUI();
        showFirstLaunchOverlay();
      } else {
        loadFolders();
        loadNotes();
      }
    }).catch(function() {
      loadFolders();
      loadNotes();
    });
  }

  /* === First-launch browse mode toggle === */
  function updateFirstLaunchUI() {
    btnNew.style.display = "none";
    btnSettings.style.display = "none";
    if (firstLaunchBrowseMode.current === "file") {
      toggleFile.classList.add("active");
      toggleFolder.classList.remove("active");
      firstLaunchLabel.textContent = "Database file";
      firstLaunchPathInput.placeholder = "/path/to/notes.db";
      firstLaunchHint.textContent = "";
    } else {
      toggleFolder.classList.add("active");
      toggleFile.classList.remove("active");
      firstLaunchLabel.textContent = "Folder for database";
      firstLaunchPathInput.placeholder = "/path/to/folder";
      firstLaunchHint.textContent = "A new notes.db will be created inside this folder.";
    }
  }

  toggleFile.addEventListener("click", function() {
    firstLaunchBrowseMode.current = "file";
    updateFirstLaunchUI();
  });

  toggleFolder.addEventListener("click", function() {
    firstLaunchBrowseMode.current = "folder";
    updateFirstLaunchUI();
  });

  /* First-launch browse with mode toggle */
  btnBrowseFirstLaunch.addEventListener("click", function() {
    if (firstLaunchBrowseMode.current === "file") {
      browseFolder(firstLaunchPathInput, firstLaunchError);
    } else {
      browseFolderPath(firstLaunchPathInput, firstLaunchError);
    }
  });

  /* First-launch connect: resolve folder to db path if needed */
  btnFirstLaunchConnect.addEventListener("click", function() {
    var path = firstLaunchPathInput.value.trim();
    if (!path) {
      showError(firstLaunchError, "Please enter a path.");
      return;
    }
    if (firstLaunchBrowseMode.current === "folder") {
      // Ensure trailing slash, then append db filename
      if (!path.endsWith("/")) path = path + "/";
      path = path + "notes.db";
      firstLaunchPathInput.value = path;
    }
    connectDb(path, firstLaunchError);
  });
  firstLaunchPathInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") btnFirstLaunchConnect.click();
  });

  function showMainButtons() {
    btnNew.style.display = "";
    btnSettings.style.display = "";
  }

  /* === Register editor callbacks with sidebar === */
  NotelySidebar.init({
    onSelectNote: showEditor,
    onShowWelcome: showWelcome
  });

  /* === Bootstrap === */
  checkConfig();

})();
