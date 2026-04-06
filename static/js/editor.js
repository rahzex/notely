/* ========================================
   Notely - Editor Module
   Editor.js + Quill, settings modal,
   first-launch overlay, DB config,
   and bootstrap.
   ======================================== */

(function() {
  "use strict";

  var $ = function(s) { return document.querySelector(s); };

  /* === DOM refs === */
  var sidebar              = $("#sidebar");
  var welcome              = $("#welcome");
  var editorCard           = $("#editor-card");
  var inpTitle             = $("#inp-title");
  var btnDelEditor         = $("#btn-del-editor");
  var btnNew               = $("#btn-new");
  var btnSave              = $("#btn-save");
  var btnClear             = $("#btn-clear");
  var btnSettings          = $("#btn-settings");
  var btnSettingsCancel    = $("#btn-settings-cancel");
  var btnSettingsConnect   = $("#btn-settings-connect");
  var btnSettingsSave      = $("#btn-settings-save");
  var btnBrowseSettings    = $("#btn-browse-settings");
  var settingsModal        = $("#settings-modal");
  var settingsPathInput    = $("#settings-path-input");
  var settingsCreateNew    = $("#settings-create-new");
  var settingsCurrentPath  = $("#settings-current-path");
  var settingsError        = $("#settings-error");
  var settingsStatus       = $("#settings-status");
  var settingsDefaultEditor = $("#settings-default-editor");
  var firstLaunchOv        = $("#first-launch-overlay");
  var firstLaunchPathInput = $("#first-launch-path-input");
  var firstLaunchError     = $("#first-launch-error");
  var firstLaunchHint      = $("#first-launch-hint");
  var firstLaunchLabel     = $("#first-launch-label");
  var btnFirstLaunchConnect = $("#btn-first-launch-connect");
  var btnBrowseFirstLaunch = $("#btn-browse-first-launch");
  var toggleFile           = $("#toggle-file");
  var toggleFolder         = $("#toggle-folder");
  var firstLaunchBrowseMode = { current: "file" };
  var settingsBrowseMode = { current: "folder" };
  var btnTheme             = $("#btn-theme");
  var editorPickerModal    = $("#editor-picker-modal");
  var pickerRemember       = $("#picker-remember");
  var quillContainer       = $("#quill-container");

  /* === Theme === */
  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("notely-theme", theme);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    applyTheme(current === "dark" ? "light" : "dark");
  }

  applyTheme(localStorage.getItem("notely-theme") || "light");
  btnTheme.addEventListener("click", toggleTheme);

  /* === State === */
  var editingId = null;
  var editingFolderId = null;
  var currentDbPath = null;
  var editor = null;       // Editor.js instance
  var quillEditor = null;  // Quill instance
  var saveTimeout = null;
  var autosaveDebounce = 3000;
  var autosaveInterval = null;
  var currentEditorMode = null;  // 'editorjs' | 'quill' | null

  /* === Default Editor Mode === */
  function getDefaultEditorMode() {
    return localStorage.getItem("notely-default-editor") || "ask";
  }

  function setDefaultEditorMode(mode) {
    localStorage.setItem("notely-default-editor", mode);
    settingsDefaultEditor.value = mode;
  }

  /* === Content Format Detection === */
  function detectContentFormat(content) {
    if (!content || content.trim() === "") {
      return { mode: "unknown" };
    }
    var trimmed = content.trim();
    if (trimmed.charAt(0) === "{") {
      try {
        var parsed = JSON.parse(trimmed);
        if (parsed.blocks && Array.isArray(parsed.blocks)) {
          return { mode: "editorjs", blocks: parsed.blocks };
        }
      } catch (e) { /* not JSON */ }
    }
    if (trimmed.charAt(0) === "[") {
      try {
        var arr = JSON.parse(trimmed);
        if (Array.isArray(arr) && arr.length > 0 && arr[0].type) {
          return { mode: "editorjs", blocks: arr };
        }
      } catch (e) { /* not JSON */ }
    }
    return { mode: "quill", html: content };
  }

  /* === Editor Container Toggling === */
  function showEditorContainer(mode) {
    document.body.classList.remove("editor-active-editorjs", "editor-active-quill");
    document.body.classList.add("editor-active-" + mode);
    currentEditorMode = mode;
  }

  function destroyActiveEditor() {
    if (currentEditorMode === "quill" && quillEditor) {
      // Quill doesn't have a destroy() - just clean up the instance
      quillEditor = null;
    }
    document.body.classList.remove("editor-active-editorjs", "editor-active-quill");
    currentEditorMode = null;
  }

  /* === Init Editor.js === */
  function initEditor() {
    if (editor) return Promise.resolve();

    var container = document.getElementById("editorjs");
    if (!container) { console.error("#editorjs not found"); return Promise.reject("No container"); }
    container.innerHTML = "";

    return new Promise(function(resolve, reject) {
      try {
        editor = new EditorJS({
          holder: 'editorjs',
          placeholder: 'Write your note here\u2026',
          autofocus: false,
          tools: {
            header: {
              class: Header,
              inlineToolbar: ['link', 'bold', 'italic', 'marker'],
              config: {
                placeholder: 'Heading',
                levels: [2, 3, 4],
                defaultLevel: 2
              }
            },
            list: {
              class: List,
              inlineToolbar: true
            },
            quote: {
              class: Quote,
              inlineToolbar: ['link', 'bold', 'italic'],
              config: {
                quotePlaceholder: 'Quote',
                captionPlaceholder: 'Author'
              }
            },
            code: {
              class: CodeTool
            },
            delimiter: {
              class: Delimiter
            },
            marker: {
              class: Marker
            },
            inlineCode: {
              class: InlineCode
            },
            checklist: {
              class: Checklist,
              inlineToolbar: true
            },
            table: {
              class: Table,
              inlineToolbar: true
            },
            embed: {
              class: Embed,
              inlineToolbar: true,
              config: {
                services: {
                  youtube: true,
                  coub: true,
                  imgur: true,
                  vimeo: true,
                  codepen: true,
                  jsfiddle: true,
                  twitch: true,
                  aparat: true,
                  pinterest: true,
                  rumble: true
                }
              }
            },
            linkTool: {
              class: LinkTool,
              inlineToolbar: true,
              config: {
                endpoint: '/api/preview'
              }
            },
            raw: {
              class: RawTool,
              inlineToolbar: true
            },
            image: {
              class: SimpleImage,
              inlineToolbar: true
            },
            warning: {
              class: Warning,
              inlineToolbar: true
            },
            attaches: {
              class: AttachesTool,
              inlineToolbar: true
            },
            alert: {
              class: Alert,
              inlineToolbar: true
            },
            toggleBlock: {
              class: ToggleBlock,
              inlineToolbar: true
            }
          },
          onReady: function() {
            resolve();
          }
        });
      } catch (e) {
        console.error("Editor.js init failed:", e);
        editor = null;
        reject(e);
      }
    });
  }

  /* === Init Quill Rich Text Editor === */
  function initQuill() {
    return new Promise(function(resolve, reject) {
      destroyActiveEditor();
      if (!quillContainer) { console.error("#quill-container not found"); return reject("No container"); }
      if (!window.Quill) { console.error("Quill library not loaded"); return reject("Not loaded"); }

      document.body.classList.add("editor-active-quill");
      quillContainer.innerHTML = '';
      quillContainer.className = "ql-snow";

      // Build custom toolbar with ALL Quill formats
      var toolbarHtml = ''
        + '<div id="quill-toolbar">'
        + '<div class="ql-formats">'
        + '<select class="ql-header"><option value="1">H1</option><option value="2">H2</option><option value="3">H3</option><option value="4">H4</option><option value="5">H5</option><option value="6">H6</option><option selected>Normal</option></select>'
        + '</div>'
        + '<div class="ql-formats">'
        + '<select class="ql-font"><option value="Arial">Arial</option><option value="Courier New">Courier New</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="Verdana">Verdana</option></select>'
        + '</div>'
        + '<div class="ql-formats">'
        + '<select class="ql-size"><option value="8px">8</option><option value="10px">10</option><option value="12px">12</option><option value="14px">14</option><option value="16px">16</option><option selected value="18px">18</option><option value="20px">20</option><option value="24px">24</option><option value="30px">30</option><option value="36px">36</option><option value="48px">48</option></select>'
        + '</div>'
        + '<div class="ql-formats">'
        + '<button class="ql-bold" title="Bold (Ctrl+B)"></button>'
        + '<button class="ql-italic" title="Italic (Ctrl+I)"></button>'
        + '<button class="ql-underline" title="Underline (Ctrl+U)"></button>'
        + '<button class="ql-strike" title="Strikethrough"></button>'
        + '<button class="ql-code" title="Inline Code"></button>'
        + '<button class="ql-code-block" title="Code Block"></button>'
        + '</div>'
        + '<div class="ql-formats">'
        + '<select class="ql-color" title="Text Color"></select>'
        + '<select class="ql-background" title="Highlight"></select>'
        + '</div>'
        + '<div class="ql-formats">'
        + '<select class="ql-align" title="Text Alignment"></select>'
        + '<button class="ql-blockquote" title="Blockquote"></button>'
        + '<button class="ql-indent" value="-1" title="Decrease Indent"></button>'
        + '<button class="ql-indent" value="+1" title="Increase Indent"></button>'
        + '</div>'
        + '<div class="ql-formats">'
        + '<button class="ql-list" value="ordered" title="Ordered List"></button>'
        + '<button class="ql-list" value="bullet" title="Bullet List"></button>'
        + '<button class="ql-clean" title="Clear Formatting"></button>'
        + '</div>'
        + '<div class="ql-formats">'
        + '<button class="ql-link" title="Insert Link"></button>'
        + '<button class="ql-image" title="Insert Image"></button>'
        + '<button class="ql-video" title="Insert Video"></button>'
        + '<button class="ql-formula" title="Insert Formula"></button>'
        + '</div>'
        + '</div>'
        + '<div id="quill-editor"></div>';

      quillContainer.innerHTML = toolbarHtml;

      // Override default size values for the ql-size dropdown (inline-style based)
      var SizeStyleAttributor = Quill.import('attributors/style/size');
      SizeStyleAttributor.whitelist = ['8px', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px'];
      Quill.register(SizeStyleAttributor, true);

      // Override default font family for the ql-font dropdown (inline-style based)
      var FontFamilyAttributor = Quill.import('attributors/style/font');
      FontFamilyAttributor.whitelist = [
        'Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana', 'sans-serif', 'serif', 'monospace'
      ];
      Quill.register(FontFamilyAttributor, true);

      // Update ql-size select values to match new whitelist
      var sizeSelect = document.querySelector('.ql-size');
      var toolbarHandlers = {
        handlers: {
          qlLink: function(value) {
            var ctx = this;
            if (value) {
              var url = prompt("Enter URL:");
              if (url) {
                var range = ctx.quill.getSelection(true);
                if (range) {
                  ctx.quill.formatText(range.index, range.length, 'link', url);
                  ctx.quill.setSelection(range.index + range.length);
                } else {
                  var at = ctx.quill.getLength();
                  ctx.quill.insertText(at, url, 'link', 'url');
                }
              }
              ctx.quill.getModule('toolbar').update();
            } else {
              ctx.quill.format('link', false);
            }
          }
        }
      };

      // Initialize Quill
      quillEditor = new Quill('#quill-editor', {
        modules: {
          toolbar: {
            container: '#quill-toolbar',
            handlers: toolbarHandlers.handlers
          },
          history: {
            delay: 2000,
            maxStack: 500,
            userOnly: true
          },
          keyboard: {
            bindings: Quill.import('modules/keyboard').DEFAULTS.bindings
          }
        },
        theme: 'snow',
        placeholder: 'Write your note here…'
      });

      // Autosave on text change
      quillEditor.on('text-change', function() {
        triggerAutosave();
      });

      // Open image URL in a prompt
      quillEditor.getModule('toolbar').addHandler('image', function() {
        var src = prompt("Enter image URL:");
        if (src) {
          var range = quillEditor.getSelection(true);
          quillEditor.insertText(range.index, '\n', Quill.sources.USER);
          quillEditor.insertEmbed(range.index + 1, 'image', src, Quill.sources.USER);
          quillEditor.setSelection(range.index + 2, Quill.sources.SILENT);
        }
      });

      // Open video URL in a prompt
      quillEditor.getModule('toolbar').addHandler('video', function() {
        var src = prompt("Enter video URL (YouTube, Vimeo, etc.):");
        if (src) {
          var range = quillEditor.getSelection(true);
          quillEditor.insertEmbed(range.index, 'video', src, Quill.sources.USER);
          quillEditor.setSelection(range.index + 1, Quill.sources.SILENT);
        }
      });

      // Open formula URL in a prompt
      quillEditor.getModule('toolbar').addHandler('formula', function() {
        var formula = prompt("Enter LaTeX formula:");
        if (formula) {
          var range = quillEditor.getSelection(true);
          quillEditor.insertEmbed(range.index, 'formula', formula, Quill.sources.USER);
          quillEditor.setSelection(range.index + 1, Quill.sources.SILENT);
        }
      });

      inpTitle.focus();
      currentEditorMode = "quill";
      resolve();
    });
  }

  /* === Activate Editor for New Note === */
  function activateEditorForNewNote(mode) {
    destroyActiveEditor();
    if (mode === "editorjs") {
      initEditor().then(function() {
        showEditorContainer("editorjs");
        currentEditorMode = "editorjs";
        editor.blocks.render({ blocks: [] });
        inpTitle.focus();
      }).catch(function(e) {
        console.error("Failed to init Editor.js:", e);
      });
    } else if (mode === "quill") {
      initQuill().then(function() {
        showEditorContainer("quill");
        currentEditorMode = "quill";
        inpTitle.focus();
      }).catch(function(e) {
        console.error("Failed to init Quill:", e);
      });
    }
  }

  /* === Auto-save === */
  function triggerAutosave() {
    if (!editingId) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(function() {
      if (currentEditorMode === "quill" && quillEditor) {
        var content = quillEditor.root.innerHTML;
        doAutosave(content);
      } else if (currentEditorMode === "editorjs" && editor) {
        editor.save().then(function(outputData) {
          doAutosave(JSON.stringify(outputData.blocks));
        }).catch(function(err) {
          console.error("Autosave save() error:", err);
        });
      }
    }, autosaveDebounce);
  }

  function doAutosave(content) {
    var body = { title: inpTitle.value, content: content, folder_id: NotelySidebar.getActiveFolderId() };
    NotelyApi.updateNote(editingId, body).catch(function(err) {
      console.error("Autosave failed:", err);
    });
  }

  /* === Periodic Autosave === */
  function startPeriodicAutosave() {
    stopPeriodicAutosave();
    autosaveInterval = setInterval(function() {
      if (!editingId) return;
      if (currentEditorMode === "quill" && quillEditor) {
        var content = quillEditor.root.innerHTML;
        doAutosave(content);
      } else if (currentEditorMode === "editorjs" && editor) {
        editor.save().then(function(outputData) {
          doAutosave(JSON.stringify(outputData.blocks));
        }).catch(function(err) {
          console.error("Autosave save() error:", err);
        });
      }
    }, 5000);
  }

  function stopPeriodicAutosave() {
    if (autosaveInterval) {
      clearInterval(autosaveInterval);
      autosaveInterval = null;
    }
  }

  /* === Save Helpers === */
  function saveFromEditorJS() {
    editor.save().then(function(outputData) {
      doSave(JSON.stringify(outputData.blocks));
    }).catch(function(err) {
      console.error("Failed to extract editor content:", err);
    });
  }

  function saveFromQuill() {
    var content = quillEditor.root.innerHTML;
    doSave(content);
  }

  function doSave(content) {
    var body = { title: inpTitle.value, content: content, folder_id: NotelySidebar.getActiveFolderId() };
    if (editingId) {
      NotelyApi.updateNote(editingId, body).then(function(saved) {
        editingId = saved.id;
        inpTitle.value = saved.title;
        loadNotes();
      }).catch(function(err) { console.error("Failed to save note:", err); });
    } else {
      NotelyApi.saveNote(body).then(function(saved) {
        var note = saved.data;
        editingId = note.id;
        inpTitle.value = note.title;
        loadNotes();
        startPeriodicAutosave();
      }).catch(function(err) { console.error("Failed to create note:", err); });
    }
  }

  /* === Editor Picker === */
  function showEditorPicker() {
    editorPickerModal.classList.add("open");
    pickerRemember.checked = false;
  }

  function hideEditorPicker() {
    editorPickerModal.classList.remove("open");
  }

  function pickEditorAndProceed(mode) {
    hideEditorPicker();
    if (pickerRemember.checked) {
      setDefaultEditorMode(mode);
    }
    activateEditorForNewNote(mode);
  }

  /* === Show editor / welcome === */
  function showEditor(note) {
    welcome.classList.remove("visible");
    editorCard.classList.add("visible");

    if (note) {
      // Existing note: detect content format
      editingId = note.id;
      inpTitle.value = note.title;
      btnDelEditor.style.display = "";
      NotelySidebar.renderAll();
      startPeriodicAutosave();

      var detected = detectContentFormat(note.content);
      if (detected.mode === "editorjs") {
        initEditor().then(function() {
          destroyActiveEditor();
          showEditorContainer("editorjs");
          try {
            editor.blocks.render({ blocks: detected.blocks });
          } catch (e) {
            console.error("Failed to render blocks, clearing:", e);
            editor.blocks.render({ blocks: [] });
          }
          inpTitle.focus();
        }).catch(function(e) {
          console.error("Failed to initialize Editor.js:", e);
        });
      } else {
        initQuill().then(function() {
          quillEditor.root.innerHTML = detected.html || "";
          inpTitle.focus();
        }).catch(function(e) {
          console.error("Failed to initialize Quill:", e);
        });
      }
    } else {
      // New/blank note: check default editor setting
      editingId = null;
      editingFolderId = NotelySidebar.getActiveFolderId();
      inpTitle.value = "";
      btnDelEditor.style.display = "none";
      NotelySidebar.renderAll();

      var defaultMode = getDefaultEditorMode();
      if (defaultMode === "ask") {
        showEditorPicker();
      } else {
        activateEditorForNewNote(defaultMode);
      }
    }
  }

  function showWelcome() {
    welcome.classList.add("visible");
    editorCard.classList.remove("visible");
    destroyActiveEditor();
    editingId = null;
    stopPeriodicAutosave();
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

  function showStatus(el, msg) {
    el.textContent = msg;
    el.style.display = "block";
  }

  function hideStatus(el) {
    el.style.display = "none";
  }

  function connectDb(path, errorEl, onSuccess, opts) {
    if (!path) {
      showError(errorEl, "Please enter a path.");
      return;
    }
    hideError(errorEl);
    if (settingsStatus) hideStatus(settingsStatus);
    NotelyApi.setConfig(path).then(function(result) {
      if (!result.ok) {
        showError(errorEl, result.data.error || "Failed to connect.");
        return;
      }
      currentDbPath = result.data.db_path || path;
      if (opts && opts.showStatus && settingsStatus) {
        showStatus(settingsStatus, "Connected — " + currentDbPath);
      }
      if (!(opts && opts.skipOverlayClose)) {
        hideFirstLaunchOverlay();
        hideSettingsModal();
        if (opts && opts.onSuccess) opts.onSuccess(currentDbPath);
      }
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

  /* === Settings browse mode toggle === */
  function updateSettingsBrowseUI() {
    if (settingsBrowseMode.current === "folder") {
      settingsToggleFolder.classList.add("active");
      settingsToggleFile.classList.remove("active");
      settingsPathInput.placeholder = "/path/to/folder";
    } else {
      settingsToggleFile.classList.add("active");
      settingsToggleFolder.classList.remove("active");
      settingsPathInput.placeholder = "/path/to/notes.db";
    }
  }

  /* === Settings modal state === */
  var settingsDbConnected = false; // whether Connect was pressed successfully this session

  function showSettingsModal() {
    settingsModal.classList.add("open");
    var card = settingsModal.querySelector(".modal-card");
    card.classList.remove("animate-close");
    card.classList.add("animate-open");
    settingsCurrentPath.textContent = currentDbPath || "Not configured";
    settingsPathInput.value = "";
    settingsDefaultEditor.value = getDefaultEditorMode();
    hideError(settingsError);
    if (settingsStatus) hideStatus(settingsStatus);
    settingsCreateNew.checked = true;
    settingsDbConnected = false;
    settingsBrowseMode.current = "folder";
    updateSettingsBrowseUI();
  }

  function hideSettingsModal() {
    var card = settingsModal.querySelector(".modal-card");
    card.classList.remove("animate-open");
    card.classList.add("animate-close");
    setTimeout(function() {
      settingsModal.classList.remove("open");
      card.classList.remove("animate-close");
      card.classList.add("animate-open");
    }, 200);
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

  /* Save — route to active editor */
  btnSave.addEventListener("click", function() {
    if (currentEditorMode === "quill" && quillEditor) {
      saveFromQuill();
    } else {
      saveFromEditorJS();
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
  /* Settings connect + save */
  btnSettingsConnect.addEventListener("click", function() {
    var path = settingsPathInput.value.trim();
    if (!path) {
      showError(settingsError, "Please enter a path to connect.");
      return;
    }
    hideError(settingsError);
    if (settingsBrowseMode.current === "folder") {
      if (!path.endsWith("/")) path = path + "/";
      path = path + "notes.db";
    }
    connectDb(path, settingsError, function() {
      settingsCurrentPath.textContent = currentDbPath;
      settingsDbConnected = true;
    }, { skipOverlayClose: true, showStatus: true });
  });

  btnSettingsSave.addEventListener("click", function() {
    /* Always save editor preference */
    setDefaultEditorMode(settingsDefaultEditor.value);
    /* If connected, currentDbPath was already saved by Connect */
    hideSettingsModal();
  });

  settingsPathInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") btnSettingsConnect.click();
  });

  /* Settings browse */
  btnBrowseSettings.addEventListener("click", function() {
    if (settingsBrowseMode.current === "folder") {
      browseFolderPath(settingsPathInput, settingsError);
    } else {
      browseFolder(settingsPathInput, settingsError);
    }
  });

  /* Settings browse mode toggle */
  var settingsToggleFolder = $("#settings-toggle-folder");
  var settingsToggleFile = $("#settings-toggle-file");

  settingsToggleFolder.addEventListener("click", function() {
    settingsBrowseMode.current = "folder";
    updateSettingsBrowseUI();
  });

  settingsToggleFile.addEventListener("click", function() {
    settingsBrowseMode.current = "file";
    updateSettingsBrowseUI();
  });

  /* Default editor setting */
  settingsDefaultEditor.addEventListener("change", function() {
    setDefaultEditorMode(this.value);
  });

  /* Editor picker */
  var pickerOptions = document.querySelectorAll("[data-picker-mode]");
  for (var i = 0; i < pickerOptions.length; i++) {
    (function(opt) {
      opt.addEventListener("click", function() {
        pickEditorAndProceed(opt.getAttribute("data-picker-mode"));
      });
    })(pickerOptions[i]);
  }
  editorPickerModal.addEventListener("click", function(e) {
    if (e.target === editorPickerModal) hideEditorPicker();
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

  // Set default editor mode select on boot
  settingsDefaultEditor.value = getDefaultEditorMode();

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