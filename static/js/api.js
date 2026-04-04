/* ========================================
   Notely - API Layer
   All server communication lives here.
   ======================================== */

var NotelyApi = (function() {

  function handleOk(r) {
    if (!r.ok) return r.json().then(function(d) { throw new Error(d.error || "Server error"); });
    return r.json();
  }

  function getJson(url) {
    return fetch(url).then(function(r) { return r.json(); });
  }

  function postJson(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function(r) {
      return r.json().then(function(d) { return { ok: r.ok, data: d }; });
    });
  }

  return {
    /* Notes */
    listNotes: function() { return getJson("/api/notes"); },

    saveNote: function(body) { return postJson("/api/notes", body); },

    updateNote: function(id, body) {
      return fetch("/api/notes/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).then(function(r) { return r.json(); });
    },

    deleteNote: function(id) {
      return fetch("/api/notes/" + id, { method: "DELETE" }).then(function() { return { ok: true }; });
    },

    /* Folders */
    listFolders: function() { return getJson("/api/folders"); },

    createFolder: function(name, parentId) {
      return postJson("/api/folders", { name: name, parent_id: parentId || null });
    },

    updateFolder: function(id, name) {
      return fetch("/api/folders/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name })
      }).then(function(r) { return r.json(); });
    },

    deleteFolder: function(id) {
      return fetch("/api/folders/" + id, { method: "DELETE" }).then(function() { return { ok: true }; });
    },

    /* Config */
    getConfig: function() { return getJson("/api/config"); },

    setConfig: function(path) { return postJson("/api/config", { db_path: path }); },

    browseFile: function() {
      return fetch("/api/config/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "file" })
      }).then(function(r) { return r.json(); });
    }
  };

})();
