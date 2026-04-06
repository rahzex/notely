/* ========================================
   Notely - Sidebar Module
   Renders folder tree, note items, search,
   folder toggles and sidebar events.
   ======================================== */

var NotelySidebar = (function() {
  var $ = function(s) { return document.querySelector(s); };

  /* === Private state === */
  var allNotes = [];
  var allFolders = [];
  var activeFolderId = null;
  var expandedFolders = {};
  var searchTerm = "";

  /* === Callbacks (set via init) === */
  var onSelectNote = null;   // function(noteData)
  var onShowWelcome = null;  // function()

  /* === Helpers === */
  function stripHtml(s) {
    if (!s) return "";
    var d = document.createElement("div");
    d.innerHTML = s;
    return d.textContent;
  }
  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
  function getChildFolders(parentId) {
    return allFolders.filter(function(f) {
      return Number(f.parent_id || 0) === Number(parentId || 0);
    });
  }
  function getAllDescendantIds(pid) {
    var ids = [];
    var kids = getChildFolders(pid);
    for (var i = 0; i < kids.length; i++) {
      ids.push(kids[i].id);
      ids = ids.concat(getAllDescendantIds(kids[i].id));
    }
    return ids;
  }
  function folderNoteCount(fid) {
    var ids = getAllDescendantIds(fid);
    ids.unshift(fid);
    var seen = {};
    ids = ids.filter(function(x) { if (seen[x]) return false; seen[x] = true; return true; });
    return allNotes.filter(function(n) { return ids.indexOf(Number(n.folder_id)) !== -1; }).length;
  }
  function getNotes(fid) {
    var n = allNotes.filter(function(note) { return Number(note.folder_id) === fid; });
    if (searchTerm) {
      var t = searchTerm.toLowerCase();
      n = n.filter(function(note) { return stripHtml(note.title).toLowerCase().indexOf(t) !== -1; });
    }
    return n;
  }

  /* === HTML generators === */
  function noteHTML(n) {
    var d = new Date(n.created_at + "Z").toLocaleDateString(undefined, { month: "short", day: "numeric" });
    var t = stripHtml(n.title) || "Untitled";
    return '<div class="note-item" data-note-id="' + n.id + '" style="animation:noteAppear 0.2s ease both"><h4>' + esc(t) + '</h4><div class="si-date">' + d + '</div></div>';
  }

  function folderContent(fid) {
    var html = '';
    var kids = getChildFolders(fid);
    for (var j = 0; j < kids.length; j++) { html += folderRow(kids[j]); }
    if (!searchTerm) {
      var notes = getNotes(fid);
      for (var k = 0; k < notes.length; k++) { html += noteHTML(notes[k]); }
    }
    return html;
  }

  function folderRow(f) {
    var fid = f.id;
    var isExp = expandedFolders[fid];
    var isActive = activeFolderId === fid;
    var cnt = folderNoteCount(fid);
    var html = '<div class="folder-item' + (isExp ? ' expanded' : '') + (isActive ? ' active' : '') + '" data-folder-id="' + fid + '">';
    html += '<svg class="folder-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
    html += '<svg class="folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
    html += '<span class="folder-name">' + esc(f.name) + '</span>';
    html += '<span class="folder-count">' + cnt + '</span>';
    html += '<span class="folder-actions"><button class="btn-rename-folder" title="Rename">&#9998;</button><button class="btn-del-folder" title="Delete">&#10005;</button></span>';
    html += '</div>';
    html += '<div class="folder-children-wrapper ' + (isExp ? 'expanded animating' : '') + '"><div class="folder-children">' + folderContent(fid) + '</div></div>';
    return html;
  }

  /* === Public: render everything === */
  function renderAll() {
    var foldersList = $("#folders-list");
    var html = "";
    var allCount = searchTerm ? (allNotes.filter(function(n) { return stripHtml(n.title).toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1; }).length) : allNotes.length;
    var allN = allNotes.filter(function(n) { return searchTerm ? stripHtml(n.title).toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1 : true; });
    var allExpanded = searchTerm || allN.length > 0;
    html += '<div class="folder-item all-folder-item' + (allExpanded ? ' expanded' : '') + '" data-folder-id="all">';
    html += '<svg class="folder-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
    html += '<span class="folder-name">All Notes</span>';
    html += '<span class="folder-count">' + allCount + '</span>';
    html += '</div>';
    if (allN.length > 0) {
      html += '<div class="folder-children-wrapper expanded"><div class="folder-children">';
      for (var i = 0; i < allN.length; i++) { html += noteHTML(allN[i]); }
      html += '</div></div>';
    } else {
      html += '<div class="folder-children-wrapper"></div>';
    }
    html += '<div class="folders-divider"></div>';
    var top = getChildFolders(null);
    for (var j = 0; j < top.length; j++) { html += folderRow(top[j]); }
    foldersList.innerHTML = html;
  }

  /* === Toggle folder expand/collapse === */
  function toggleFolder(fid, folderItem) {
    var wrapper = folderItem.nextElementSibling;
    if (!wrapper || !wrapper.classList.contains("folder-children-wrapper")) return;

    var isExpanded = wrapper.classList.contains("expanded");
    if (isExpanded) {
      wrapper.classList.remove("expanded");
      wrapper.style.maxHeight = wrapper.scrollHeight + "px";
      wrapper.style.transition = "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
      folderItem.classList.remove("expanded");
      wrapper.offsetHeight;
      wrapper.style.maxHeight = "0";
      setTimeout(function() {
        wrapper.removeAttribute("style");
        wrapper.innerHTML = "";
      }, 260);
      expandedFolders[fid] = false;
    } else {
      var kidsHTML = folderContent(fid);
      wrapper.innerHTML = '<div class="folder-children">' + kidsHTML + '</div>';
      wrapper.style.maxHeight = "0px";
      wrapper.style.transition = "none";
      wrapper.offsetHeight;
      wrapper.style.transition = "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
      wrapper.style.maxHeight = "2000px";
      folderItem.classList.add("expanded");
      wrapper.classList.add("expanded");
      expandedFolders[fid] = true;
    }
  }

  /* === Sidebar toggle (collapse/expand) === */
  $("#sidebar-toggle").addEventListener("click", function() {
    $("#sidebar").classList.toggle("collapsed");
    $("#sidebar-toggle").classList.toggle("rotated");
  });

  /* === Search === */
  var searchInput = $("#search-input");
  searchInput.addEventListener("input", function() {
    searchTerm = this.value.trim();
    renderAll();
  });

  /* === Folder tree click (delegated) === */
  var foldersList = $("#folders-list");
  foldersList.addEventListener("click", function(e) {
    /* Note item click */
    var noteItem = e.target.closest(".note-item");
    if (noteItem) {
      var nid = Number(noteItem.dataset.noteId);
      for (var i = 0; i < allNotes.length; i++) {
        if (allNotes[i].id === nid) { if (onSelectNote) onSelectNote(allNotes[i]); return; }
      }
      return;
    }

    /* Rename button */
    var renameBtn = e.target.closest(".btn-rename-folder");
    if (renameBtn) {
      e.stopPropagation();
      var fol = renameBtn.closest(".folder-item");
      var fid = Number(fol.dataset.folderId);
      var nameEl = fol.querySelector(".folder-name");
      var newName = prompt("Rename folder:", nameEl.textContent);
      if (newName && newName.trim()) {
        NotelyApi.updateFolder(fid, newName.trim()).then(function(data) {
          for (var i = 0; i < allFolders.length; i++) {
            if (allFolders[i].id === fid) allFolders[i].name = data.name;
          }
          renderAll();
        });
      }
      return;
    }

    /* Delete button */
    var delBtn = e.target.closest(".btn-del-folder");
    if (delBtn) {
      e.stopPropagation();
      var fol2 = delBtn.closest(".folder-item");
      var fid2 = Number(fol2.dataset.folderId);
      if (confirm("Delete this folder? Notes will become uncategorized.")) {
        NotelyApi.deleteFolder(fid2).then(function() {
          allFolders = allFolders.filter(function(f) { return f.id !== fid2; });
          if (activeFolderId === fid2) activeFolderId = null;
          renderAll();
        });
      }
      return;
    }

    /* Chevron click (toggle expand) */
    var chevron = e.target.closest(".folder-item .folder-chevron");
    if (chevron) {
      e.stopPropagation();
      var fol3 = chevron.closest(".folder-item");
      var fcId = fol3.dataset.folderId;
      toggleFolder(fcId === "all" ? "all" : Number(fcId), fol3);
      return;
    }

    /* Folder item click */
    var item = e.target.closest(".folder-item");
    if (!item) return;
    var fs = item.dataset.folderId;
    var fid3 = fs === "null" ? null : (fs === "all" ? "all" : Number(fs));
    if (fid3 === null || fid3 === "all") {
      activeFolderId = null;
      var allItems = foldersList.querySelectorAll(".folder-item");
      for (var p = 0; p < allItems.length; p++) allItems[p].classList.remove("active");
      item.classList.add("active");
      if (allNotes.length > 0) {
        if (onSelectNote) onSelectNote(allNotes[0]);
      } else {
        if (onShowWelcome) onShowWelcome();
      }
      return;
    }
    activeFolderId = fid3;
    var allItems2 = foldersList.querySelectorAll(".folder-item");
    for (var q = 0; q < allItems2.length; q++) allItems2[q].classList.remove("active");
    item.classList.add("active");
    var wrapper2 = item.nextElementSibling;
    if (wrapper2 && wrapper2.classList.contains("folder-children-wrapper")) {
      toggleFolder(fid3, item);
    }
  });

  /* === Add folder button === */
  $("#btn-add-folder").addEventListener("click", function() {
    var name = prompt("Folder name:");
    if (!name || !name.trim()) return;
    var parentId = activeFolderId;
    NotelyApi.createFolder(name.trim(), parentId).then(function(data) {
      allFolders.push(data.data);
      if (parentId) expandedFolders[parentId] = true;
      renderAll();
    });
  });

  /* === Public API === */
  return {
    /* Set external callbacks: fn is (noteData) for onSelect, fn() for onWelcome */
    init: function(callbacks) {
      onSelectNote = callbacks.onSelectNote || null;
      onShowWelcome = callbacks.onShowWelcome || null;
    },
    renderAll: renderAll,
    toggleFolder: toggleFolder,
    setNotes: function(notes) { allNotes = notes; renderAll(); },
    setFolders: function(folders) { allFolders = folders; renderAll(); },
    refreshNoteCache: function(autosave) {
      NotelyApi.listNotes().then(function(notes) {
        allNotes = notes;
        /* Update title in DOM without re-rendering (prevents blink animation) */
        for (var i = 0; i < notes.length; i++) {
          var item = document.querySelector('.note-item[data-note-id="' + notes[i].id + '"] h4');
          if (item) {
            item.textContent = stripHtml(notes[i].title) || "Untitled";
          }
        }
        if (!autosave) renderAll();
      });
    },
    getActiveFolderId: function() { return activeFolderId; },
    getExpandedFolders: function() { return expandedFolders; },
    getNotes: function() { return allNotes; },
    getFolders: function() { return allFolders; },
  };

})();
