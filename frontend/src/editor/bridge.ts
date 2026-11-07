/** Runs inside the page iframe. It never gets saved into the student's HTML. */
export const BRIDGE = `
(function () {
  var selected = null;
  var hover = null;
  var box = null;
  var handles = null;
  var marks = [];
  var tableScope = "cell";
  var scopeIndex = -1;
  var tableUi = null;
  var choosing = false;
  var dragSelect = null;
  var anchorRow = -1;
  var anchorCol = -1;

  function pathOf(el) {
    var path = [];
    while (el && el !== document.body) {
      var parent = el.parentElement;
      if (!parent) break;
      path.unshift(Array.prototype.indexOf.call(parent.children, el));
      el = parent;
    }
    return path;
  }

  function elAt(path) {
    var el = document.body;
    for (var i = 0; i < path.length; i++) {
      el = el.children[path[i]];
      if (!el) return null;
    }
    return el;
  }

  function cleanup(root) {
    root.querySelectorAll("[data-wd-ui]").forEach(function (node) { node.remove(); });
    root.querySelectorAll(".wd-selected,.wd-hover,.wd-table-on").forEach(function (node) {
      node.classList.remove("wd-selected");
      node.classList.remove("wd-hover");
      node.classList.remove("wd-table-on");
      if (!node.classList.length) node.removeAttribute("class");
    });
    root.querySelectorAll("[data-wd-merge]").forEach(function (node) { node.removeAttribute("data-wd-merge"); });
    root.querySelectorAll("[contenteditable]").forEach(function (node) {
      node.removeAttribute("contenteditable");
    });
    root.classList.remove("wd-xray");
  }

  function pageNodes() {
    return Array.prototype.filter.call(document.body.children, function (node) {
      if (!node || node.nodeType !== 1) return false;
      if (node.getAttribute && node.getAttribute("data-wd-ui")) return false;
      var tag = node.tagName;
      if (tag === "STYLE" || tag === "SCRIPT") return false;
      return true;
    });
  }

  function cleanOuter(el) {
    var copy = el.cloneNode(true);
    cleanup(copy);
    copy.classList.remove("wd-selected");
    copy.classList.remove("wd-hover");
    copy.classList.remove("wd-table-on");
    copy.removeAttribute("contenteditable");
    if (!copy.classList.length) copy.removeAttribute("class");
    return copy.outerHTML;
  }

  function selectionMarkup() {
    var marked = pageNodes().filter(function (node) { return node.classList.contains("wd-selected"); });
    if (marked.length > 1) return marked.map(cleanOuter).join("\\n");
    if (selected) return cleanOuter(selected);
    var nodes = pageNodes();
    return nodes.map(cleanOuter).join("\\n");
  }

  function publishClip(html) {
    emit("clip", { html: html, text: document.body.innerText || "" });
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(html).catch(function () {});
  }

  function textNodes() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent || parent.closest("style, script, [data-wd-ui]")) return NodeFilter.FILTER_REJECT;
        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var list = [];
    while (walker.nextNode()) list.push(walker.currentNode);
    return list;
  }

  function swapText(text, query, value, all) {
    var lower = text.toLowerCase();
    var q = String(query || "").toLowerCase();
    if (!q) return { text: text, n: 0 };
    var out = "";
    var i = 0;
    var n = 0;
    while (i < text.length) {
      var at = lower.indexOf(q, i);
      if (at < 0) { out += text.slice(i); break; }
      out += text.slice(i, at) + (value || "");
      i = at + q.length;
      n += 1;
      if (!all) { out += text.slice(i); break; }
    }
    return { text: out, n: n };
  }

  var findAt = 0;
  function findText(query, again) {
    var q = String(query || "").toLowerCase();
    if (!q) return false;
    var nodes = textNodes();
    if (!nodes.length) return false;
    var start = again ? findAt : 0;
    if (start >= nodes.length) start = 0;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[(start + i) % nodes.length];
      if (node.textContent.toLowerCase().indexOf(q) < 0) continue;
      findAt = ((start + i) % nodes.length) + 1;
      var el = node.parentElement;
      if (el) {
        select(el);
        if (el.scrollIntoView) el.scrollIntoView({ block: "center", inline: "nearest" });
      }
      return true;
    }
    return false;
  }

  function replaceText(query, value, all) {
    var nodes = textNodes();
    var count = 0;
    for (var i = 0; i < nodes.length; i++) {
      var changed = swapText(nodes[i].textContent, query, value, !!all);
      if (!changed.n) continue;
      nodes[i].textContent = changed.text;
      count += changed.n;
      if (!all) break;
    }
    if (count) {
      emitHtml();
      if (selected) describe(selected);
    }
    return count;
  }

  function selectAll() {
    var typing = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute("contenteditable") === "true";
    if (typing) { document.execCommand("selectAll"); return; }
    var nodes = pageNodes();
    if (!nodes.length) return;
    if (nodes.length === 1) { select(nodes[0]); return; }
    document.querySelectorAll(".wd-selected").forEach(function (node) { node.classList.remove("wd-selected"); });
    nodes.forEach(function (node) { node.classList.add("wd-selected"); });
    selected = nodes[0];
    emit("select", {
      path: pathOf(selected),
      tag: selected.tagName.toLowerCase(),
      id: "",
      className: "",
      text: document.body.innerText || "",
      canEditText: false,
      attrs: {},
      style: {},
      crumbs: crumbs(selected),
      table: null,
      html: nodes.map(cleanOuter).join("\\n"),
      whole: true
    });
    placeHandles();
  }

  function removeSelection() {
    var marked = pageNodes().filter(function (node) { return node.classList.contains("wd-selected"); });
    if (marked.length > 1) marked.forEach(function (node) { node.remove(); });
    else if (selected && selected !== document.body) selected.remove();
    else return;
    emitHtml();
    select(null);
  }

  function snapshot() {
    var clone = document.body.cloneNode(true);
    cleanup(clone);
    return clone.innerHTML;
  }

  function emit(type, extra) {
    var message = { source: "wd", type: type };
    if (extra) Object.keys(extra).forEach(function (key) { message[key] = extra[key]; });
    parent.postMessage(message, "*");
  }

  function emitHtml() {
    emit("html", { html: snapshot() });
  }

  function crumbs(el) {
    var list = [];
    var cur = el;
    while (cur && cur !== document.body) {
      list.unshift({ tag: cur.tagName.toLowerCase(), path: pathOf(cur) });
      cur = cur.parentElement;
    }
    return list;
  }

  function describe(el) {
    var style = {};
    ["color", "backgroundColor", "fontSize", "textAlign", "padding", "margin", "borderRadius", "fontWeight", "fontStyle", "textDecoration", "fontFamily", "width", "height", "maxWidth", "display", "verticalAlign", "float", "objectFit"].forEach(function (prop) {
      if (el.style[prop]) style[prop] = el.style[prop];
    });
    var attrs = {};
    Array.prototype.forEach.call(el.attributes, function (attr) {
      if (attr.name === "class" || attr.name === "style" || attr.name.indexOf("data-wd") === 0 || attr.name === "contenteditable") return;
      attrs[attr.name] = attr.value;
    });
    var onlyText = Array.prototype.every.call(el.childNodes, function (node) {
      return node.nodeType === 3 || (node.nodeType === 1 && node.tagName === "BR");
    });
    var classes = Array.prototype.filter.call(el.classList, function (name) {
      return name !== "wd-selected" && name !== "wd-hover" && name !== "wd-table-on";
    }).join(" ");
    emit("select", {
      path: pathOf(el),
      tag: el.tagName.toLowerCase(),
      id: el.id || "",
      className: classes,
      text: onlyText ? el.innerText : "",
      canEditText: onlyText,
      attrs: attrs,
      style: style,
      crumbs: crumbs(el),
      table: tableInfo(el),
      html: cleanOuter(el),
      whole: false
    });
  }

  function select(el, keepMarks) {
    if (!keepMarks) {
      clearMarks();
      anchorRow = -1;
      anchorCol = -1;
    }
    document.querySelectorAll(".wd-selected").forEach(function (node) {
      if (node !== el) node.classList.remove("wd-selected");
    });
    selected = el && el !== document.body ? el : null;
    if (selected) {
      selected.classList.add("wd-selected");
      describe(selected);
    } else {
      emit("select", { path: null });
    }
    placeHandles();
  }

  function ensureBox() {
    if (box) return box;
    box = document.createElement("div");
    box.setAttribute("data-wd-ui", "1");
    box.id = "wd-box";
    box.style.cssText = "position:fixed;pointer-events:none;z-index:2147483646;display:none;";
    box.innerHTML = '<div data-wd-ui="1" class="m"></div><div data-wd-ui="1" class="p"></div><div data-wd-ui="1" class="c"></div><div data-wd-ui="1" class="l"></div>';
    document.body.appendChild(box);
    return box;
  }

  function paintBox(el) {
    if (!document.body.classList.contains("wd-xray") || !el || el === document.body) {
      if (box) box.style.display = "none";
      return;
    }
    var node = ensureBox();
    var rect = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    var mt = parseFloat(cs.marginTop) || 0;
    var mr = parseFloat(cs.marginRight) || 0;
    var mb = parseFloat(cs.marginBottom) || 0;
    var ml = parseFloat(cs.marginLeft) || 0;
    var bt = parseFloat(cs.borderTopWidth) || 0;
    var br = parseFloat(cs.borderRightWidth) || 0;
    var bb = parseFloat(cs.borderBottomWidth) || 0;
    var bl = parseFloat(cs.borderLeftWidth) || 0;
    var pt = parseFloat(cs.paddingTop) || 0;
    var pr = parseFloat(cs.paddingRight) || 0;
    var pb = parseFloat(cs.paddingBottom) || 0;
    var pl = parseFloat(cs.paddingLeft) || 0;
    node.style.display = "block";
    var margin = node.querySelector(".m");
    var pad = node.querySelector(".p");
    var content = node.querySelector(".c");
    var label = node.querySelector(".l");
    margin.style.cssText = "position:fixed;background:rgba(234,88,12,.28);left:" + (rect.left - ml) + "px;top:" + (rect.top - mt) + "px;width:" + (rect.width + ml + mr) + "px;height:" + (rect.height + mt + mb) + "px;";
    pad.style.cssText = "position:fixed;background:rgba(22,163,74,.35);left:" + rect.left + "px;top:" + rect.top + "px;width:" + rect.width + "px;height:" + rect.height + "px;";
    content.style.cssText = "position:fixed;background:rgba(37,99,235,.35);left:" + (rect.left + bl + pl) + "px;top:" + (rect.top + bt + pt) + "px;width:" + Math.max(0, rect.width - bl - br - pl - pr) + "px;height:" + Math.max(0, rect.height - bt - bb - pt - pb) + "px;";
    label.style.cssText = "position:fixed;left:" + Math.max(4, rect.left - ml) + "px;top:" + Math.max(4, rect.top - mt - 22) + "px;background:#1c1917;color:#fff;font:12px/1.4 ui-monospace,monospace;padding:2px 6px;border-radius:6px;white-space:nowrap;";
    label.textContent = "<" + el.tagName.toLowerCase() + ">  " + Math.round(rect.width) + " × " + Math.round(rect.height)
      + "   margin " + Math.round(mt) + "  padding " + Math.round(pt);
  }

  function ensureHandles() {
    if (handles && handles.isConnected) return handles;
    handles = document.createElement("div");
    handles.setAttribute("data-wd-ui", "1");
    handles.id = "wd-resize";
    handles.style.cssText = "position:fixed;z-index:2147483647;display:none;border:2px solid #0f766e;box-sizing:border-box;pointer-events:none;border-radius:2px;";
    var grip = document.createElement("div");
    grip.setAttribute("data-wd-ui", "1");
    grip.style.cssText = "position:absolute;right:-8px;bottom:-8px;width:18px;height:18px;background:#fff;border:2px solid #0f766e;border-radius:4px;pointer-events:auto;cursor:nwse-resize;box-shadow:0 1px 4px rgba(0,0,0,.25);";
    var label = document.createElement("div");
    label.className = "wd-size";
    label.setAttribute("data-wd-ui", "1");
    label.style.cssText = "position:absolute;left:0;top:-22px;background:#0f766e;color:#fff;font:12px/1 ui-sans-serif,sans-serif;padding:4px 6px;border-radius:6px;pointer-events:none;";
    handles.appendChild(label);
    handles.appendChild(grip);
    document.body.appendChild(handles);
    grip.addEventListener("pointerdown", startResize);
    return handles;
  }

  function placeHandles() {
    if (!selected || selected.tagName !== "IMG") {
      if (handles) handles.style.display = "none";
      placeTableChrome();
      return;
    }
    var node = ensureHandles();
    var rect = selected.getBoundingClientRect();
    if (rect.width < 2 && rect.height < 2) {
      node.style.display = "none";
      return;
    }
    node.style.display = "block";
    node.style.left = rect.left + "px";
    node.style.top = rect.top + "px";
    node.style.width = rect.width + "px";
    node.style.height = rect.height + "px";
    var parent = selected.parentElement || document.body;
    var parentWidth = parent.getBoundingClientRect().width || rect.width;
    var pct = Math.round((rect.width / parentWidth) * 100);
    var label = node.querySelector(".wd-size");
    if (label) {
      label.textContent = pct + "%";
      label.style.top = rect.top < 28 ? "4px" : "-22px";
    }
    placeTableChrome();
  }

  function startResize(event) {
    if (!selected || selected.tagName !== "IMG") return;
    event.preventDefault();
    event.stopPropagation();
    var img = selected;
    var parent = img.parentElement || document.body;
    var parentWidth = parent.getBoundingClientRect().width || 1;
    var startX = event.clientX;
    var startW = img.getBoundingClientRect().width;
    function move(ev) {
      var next = Math.max(48, startW + (ev.clientX - startX));
      var pct = Math.min(100, Math.max(10, Math.round((next / parentWidth) * 100)));
      img.style.width = pct + "%";
      img.style.height = "auto";
      img.style.maxWidth = "100%";
      placeHandles();
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      emitHtml();
      describe(img);
      placeHandles();
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function layoutPictures(img, width, valign) {
    var group = [img];
    if (width !== "100%") {
      var prev = img.previousElementSibling;
      while (prev && prev.tagName === "IMG") { group.unshift(prev); prev = prev.previousElementSibling; }
      var next = img.nextElementSibling;
      while (next && next.tagName === "IMG") { group.push(next); next = next.nextElementSibling; }
    }
    group.forEach(function (node) {
      node.style.maxWidth = "100%";
      node.style.height = "auto";
      node.style.float = "none";
      if (width === "100%") {
        node.style.display = "block";
        node.style.width = "100%";
        node.style.margin = "12px 0";
        node.style.verticalAlign = "";
      } else {
        node.style.display = "inline-block";
        node.style.width = width;
        node.style.verticalAlign = valign || "top";
        node.style.margin = "8px 1%";
      }
    });
  }

  function insertHtml(html, path, tag) {
    var holder = document.createElement("div");
    holder.innerHTML = html;
    var nodes = Array.prototype.filter.call(holder.childNodes, function (node) {
      return !(node.nodeType === 3 && !node.textContent.trim());
    });
    var target = path && path.length ? elAt(path) : null;
    var containers = { DIV: 1, SECTION: 1, MAIN: 1, HEADER: 1, FOOTER: 1, ARTICLE: 1, ASIDE: 1, NAV: 1, UL: 1, OL: 1, FORM: 1, LI: 1, TD: 1, TH: 1, FIGURE: 1 };
    var inside = target && (containers[target.tagName] && (target.classList.contains("col") || target.childElementCount === 0 || tag === "div" || tag === "section" || tag === "main" || tag === "header" || tag === "footer" || tag === "nav" || tag === "form" || tag === "td" || tag === "th" || tag === "li"));
    if (target && inside) nodes.forEach(function (node) { target.appendChild(node); });
    else if (target) {
      var ref = target;
      nodes.forEach(function (node) { ref.after(node); ref = node; });
    } else nodes.forEach(function (node) { document.body.appendChild(node); });
    emitHtml();
    var first = nodes.filter(function (node) { return node.nodeType === 1; })[0];
    if (first) select(first);
  }

  function cellOf(el) { return el && el.closest ? el.closest("td,th") : null; }
  function rowOf(el) { return el && el.closest ? el.closest("tr") : null; }

  function focusCell(el) {
    var direct = cellOf(el);
    if (direct) return direct;
    var row = rowOf(el);
    if (row && row.cells[0]) return row.cells[0];
    var table = el && el.closest ? el.closest("table") : null;
    if (table && table.rows[0] && table.rows[0].cells[0]) return table.rows[0].cells[0];
    return null;
  }

  function spanCount(cell, name) {
    var n = parseInt(cell.getAttribute(name) || "1", 10);
    return n > 0 ? n : 1;
  }

  function gridOf(table) {
    var rows = Array.prototype.slice.call(table.rows);
    var grid = [];
    var place = new Map();
    rows.forEach(function (row, r) {
      var c = 0;
      Array.prototype.forEach.call(row.cells, function (cell) {
        while (grid[r] && grid[r][c]) c++;
        var cs = spanCount(cell, "colspan");
        var rs = spanCount(cell, "rowspan");
        place.set(cell, { r: r, c: c, rs: rs, cs: cs });
        for (var rr = 0; rr < rs; rr++) {
          if (!grid[r + rr]) grid[r + rr] = [];
          for (var cc = 0; cc < cs; cc++) grid[r + rr][c + cc] = cell;
        }
        c += cs;
      });
    });
    var cols = 0;
    grid.forEach(function (line) { if (line.length > cols) cols = line.length; });
    return { rows: rows, grid: grid, place: place, cols: cols };
  }

  function plainColor(value) {
    if (!value || value === "transparent") return "";
    var text = String(value);
    if (text.charAt(0) === "#") return text.length > 7 ? text.slice(0, 7) : text;
    var open = text.indexOf("(");
    var close = text.indexOf(")");
    if (open < 0 || close < 0) return "";
    var bits = text.slice(open + 1, close).split(",");
    if (bits.length < 3) return "";
    if (bits.length > 3 && parseFloat(bits[3]) === 0) return "";
    function hex(part) {
      var v = Math.max(0, Math.min(255, Math.round(parseFloat(part) || 0)));
      var s = v.toString(16);
      return s.length < 2 ? "0" + s : s;
    }
    return "#" + hex(bits[0]) + hex(bits[1]) + hex(bits[2]);
  }

  function sideWord(value, kind) {
    if (kind === "v") {
      if (value === "top") return "top";
      if (value === "bottom") return "bottom";
      if (value === "middle" || value === "center") return "middle";
      return "";
    }
    if (value === "center") return "center";
    if (value === "right" || value === "end") return "right";
    if (value === "left" || value === "start") return "left";
    return "";
  }

  function tableInfo(el) {
    var cell = focusCell(el);
    if (!cell) return null;
    var table = cell.closest("table");
    if (!table) return null;
    var model = gridOf(table);
    var spot = model.place.get(cell);
    if (!spot) return null;
    var view = table.ownerDocument.defaultView;
    var tableCss = view.getComputedStyle(table);
    var cellCss = view.getComputedStyle(cell);
    var rowEl = cell.parentElement;
    var rowBox = rowEl ? rowEl.getBoundingClientRect() : null;
    var colBox = columnBox(model, spot.c);
    var gap = tableCss.borderCollapse === "collapse" ? 0 : Math.round(parseFloat(tableCss.borderSpacing) || 0);
    return {
      scope: tableScope,
      colspan: spot.cs,
      rowspan: spot.rs,
      cols: model.cols,
      rows: model.rows.length,
      count: marks.length > 1 ? marks.length : 1,
      col: (tableScope === "col" && scopeIndex >= 0 ? scopeIndex : spot.c) + 1,
      row: (tableScope === "row" && scopeIndex >= 0 ? scopeIndex : spot.r) + 1,
      width: table.style.width || Math.round(table.getBoundingClientRect().width) + "px",
      height: table.style.height || Math.round(table.getBoundingClientRect().height) + "px",
      align: tableAlign(table),
      all: wholeMarked(model),
      marginTop: marginSide(table, "marginTop"),
      marginRight: marginSide(table, "marginRight"),
      marginBottom: marginSide(table, "marginBottom"),
      marginLeft: marginSide(table, "marginLeft"),
      border: String(Math.round(parseFloat(cellCss.borderTopWidth) || 0)),
      borderColor: plainColor(cell.style.borderTopColor || cellCss.borderTopColor) || "#d6d3d1",
      pad: String(Math.round(parseFloat(cellCss.paddingTop) || 0)),
      spacing: String(gap),
      background: plainColor(table.style.backgroundColor || tableCss.backgroundColor),
      cellColor: plainColor(cell.style.backgroundColor || cellCss.backgroundColor),
      cellAlign: sideWord(cell.style.textAlign || cellCss.textAlign, "h"),
      cellValign: sideWord(cell.style.verticalAlign || cellCss.verticalAlign, "v"),
      rowHeight: String(Math.round(rowBox ? rowBox.height : 0)),
      colWidth: String(colBox ? Math.round(colBox.width) : 0)
    };
  }

  function marginSide(table, prop) {
    if (table.style[prop] === "auto") return "auto";
    var view = table.ownerDocument.defaultView;
    var n = parseFloat(view.getComputedStyle(table)[prop]);
    return String(Math.round(isFinite(n) ? n : 0));
  }

  function tableAlign(table) {
    var left = table.style.marginLeft;
    var right = table.style.marginRight;
    if (left === "auto" && right === "auto") return "center";
    if (left === "auto") return "right";
    return "left";
  }

  function clearMarks() {
    marks.forEach(function (cell) {
      if (!cell.classList) return;
      cell.classList.remove("wd-table-on");
      if (!cell.classList.length) cell.removeAttribute("class");
    });
    marks = [];
    tableScope = "cell";
    scopeIndex = -1;
  }

  function applyMarks(list, scope) {
    clearMarks();
    var unique = [];
    list.forEach(function (cell) {
      if (!cell || unique.indexOf(cell) !== -1) return;
      unique.push(cell);
      cell.classList.add("wd-table-on");
    });
    marks = unique;
    tableScope = scope;
  }

  function cellsIn(model, r1, c1, r2, c2) {
    var list = [];
    for (var r = r1; r <= r2; r++) {
      if (!model.grid[r]) continue;
      for (var c = c1; c <= c2; c++) if (model.grid[r][c]) list.push(model.grid[r][c]);
    }
    return list;
  }

  function selectCells(anchor, list, scope, index) {
    if (!anchor) return;
    select(anchor, true);
    applyMarks(list, scope);
    scopeIndex = index;
    describe(anchor);
    if (!choosing) placeTableChrome();
  }

  function selectRow(table, at) {
    var model = gridOf(table);
    selectCells(model.grid[at] && model.grid[at][0], cellsIn(model, at, 0, at, Math.max(0, model.cols - 1)), "row", at);
    anchorRow = at;
    anchorCol = -1;
  }

  function selectColumn(table, at) {
    var model = gridOf(table);
    var anchor = null;
    for (var r = 0; r < model.rows.length && !anchor; r++) anchor = model.grid[r] && model.grid[r][at];
    selectCells(anchor, cellsIn(model, 0, at, Math.max(0, model.rows.length - 1), at), "col", at);
    anchorCol = at;
    anchorRow = -1;
  }

  function selectSpan(a, b) {
    var table = a.closest("table");
    var model = gridOf(table);
    var pa = model.place.get(a);
    var pb = model.place.get(b);
    if (!pa || !pb) return;
    var r1 = Math.min(pa.r, pb.r);
    var c1 = Math.min(pa.c, pb.c);
    var r2 = Math.max(pa.r + pa.rs - 1, pb.r + pb.rs - 1);
    var c2 = Math.max(pa.c + pa.cs - 1, pb.c + pb.cs - 1);
    var guard = 0;
    var grew = true;
    while (grew && guard < 12) {
      grew = false;
      guard += 1;
      for (var r = r1; r <= r2; r++) {
        for (var c = c1; c <= c2; c++) {
          var spot = model.grid[r] && model.place.get(model.grid[r][c]);
          if (!spot) continue;
          if (spot.r < r1) { r1 = spot.r; grew = true; }
          if (spot.c < c1) { c1 = spot.c; grew = true; }
          if (spot.r + spot.rs - 1 > r2) { r2 = spot.r + spot.rs - 1; grew = true; }
          if (spot.c + spot.cs - 1 > c2) { c2 = spot.c + spot.cs - 1; grew = true; }
        }
      }
    }
    anchorRow = -1;
    anchorCol = -1;
    selectCells(a, cellsIn(model, r1, c1, r2, c2), "range", -1);
  }

  function selectRows(table, from, to) {
    var model = gridOf(table);
    var r1 = Math.min(from, to);
    var r2 = Math.max(from, to);
    var start = cellOf(model.grid[r1] && model.grid[r1][0]);
    var last = model.grid[r2];
    var end = last ? cellOf(last[Math.max(0, model.cols - 1)]) : null;
    if (start && end) selectSpan(start, end);
    anchorRow = from;
    anchorCol = -1;
  }

  function selectCols(table, from, to) {
    var model = gridOf(table);
    var c1 = Math.min(from, to);
    var c2 = Math.max(from, to);
    var start = null;
    var end = null;
    for (var r = 0; r < model.rows.length && !start; r++) start = cellOf(model.grid[r] && model.grid[r][c1]);
    for (var r2 = model.rows.length - 1; r2 >= 0 && !end; r2--) end = cellOf(model.grid[r2] && model.grid[r2][c2]);
    if (start && end) selectSpan(start, end);
    anchorCol = from;
    anchorRow = -1;
  }

  function freshCell(row) {
    var head = row.parentElement && row.parentElement.tagName === "THEAD";
    var cell = document.createElement(head ? "th" : "td");
    cell.textContent = " ";
    return cell;
  }

  function insertCellAt(row, visualCol, model) {
    var cell = freshCell(row);
    var before = null;
    Array.prototype.forEach.call(row.cells, function (existing) {
      if (before) return;
      var spot = model.place.get(existing);
      if (spot && spot.c >= visualCol) before = existing;
    });
    if (before) before.before(cell);
    else row.appendChild(cell);
    return cell;
  }

  function insertColumn(table, at) {
    var model = gridOf(table);
    var cols = model.cols;
    if (at < 0) at = 0;
    if (at > cols) at = cols;
    model.rows.forEach(function (row, r) {
      if (at >= cols) {
        row.appendChild(freshCell(row));
        return;
      }
      var cover = model.grid[r] && model.grid[r][at];
      if (!cover) {
        insertCellAt(row, at, model);
        return;
      }
      var spot = model.place.get(cover);
      if (spot.r !== r) {
        if (spot.c >= at) insertCellAt(row, at, model);
        return;
      }
      if (spot.c < at) cover.setAttribute("colspan", String(spot.cs + 1));
      else insertCellAt(row, at, model);
    });
    var group = table.querySelector("colgroup");
    if (group) {
      var col = document.createElement("col");
      col.style.width = "80px";
      group.insertBefore(col, group.children[at] || null);
      var sum = 0;
      for (var i = 0; i < group.children.length; i++) sum += parseFloat(group.children[i].style.width) || 80;
      table.style.width = Math.round(sum) + "px";
    }
  }

  function insertRowAt(table, at) {
    var model = gridOf(table);
    var cols = Math.max(1, model.cols);
    var made = document.createElement("tr");
    var ref = table.rows[at] || null;
    var parent = ref ? ref.parentElement : (table.tBodies[0] || table);
    if (ref) parent.insertBefore(made, ref);
    else parent.appendChild(made);
    var done = [];
    for (var c = 0; c < cols; c++) {
      if (done[c]) continue;
      var above = at > 0 && model.grid[at - 1] ? model.grid[at - 1][c] : null;
      var spot = above ? model.place.get(above) : null;
      if (spot && spot.r < at && spot.r + spot.rs > at) {
        above.setAttribute("rowspan", String(spot.rs + 1));
        for (var k = 0; k < spot.cs; k++) done[c + k] = true;
        continue;
      }
      made.appendChild(freshCell(made));
    }
    return made;
  }

  function moveCell(row, cell, visualCol, model) {
    var before = null;
    Array.prototype.forEach.call(row.cells, function (existing) {
      if (before || existing === cell) return;
      var spot = model.place.get(existing);
      if (spot && spot.c >= visualCol) before = existing;
    });
    if (before) before.before(cell);
    else row.appendChild(cell);
  }

  function deleteColumn(table, at) {
    var model = gridOf(table);
    if (model.cols < 2 || at < 0 || at >= model.cols) return false;
    var seen = [];
    model.rows.forEach(function (row, r) {
      var cell = model.grid[r] && model.grid[r][at];
      if (!cell || seen.indexOf(cell) !== -1) return;
      seen.push(cell);
      var spot = model.place.get(cell);
      if (spot.cs > 1) {
        if (spot.cs === 2) cell.removeAttribute("colspan");
        else cell.setAttribute("colspan", String(spot.cs - 1));
      } else cell.remove();
    });
    var group = table.querySelector("colgroup");
    if (group && group.children[at]) {
      group.children[at].remove();
      var sum = 0;
      for (var i = 0; i < group.children.length; i++) sum += parseFloat(group.children[i].style.width) || 0;
      if (sum) table.style.width = Math.round(sum) + "px";
    }
    return true;
  }

  function deleteRow(table, at) {
    var model = gridOf(table);
    if (model.rows.length < 2 || at < 0 || at >= model.rows.length) return false;
    var row = model.rows[at];
    var seen = [];
    function once(cell) {
      if (!cell || seen.indexOf(cell) !== -1) return false;
      seen.push(cell);
      return true;
    }
    Array.prototype.forEach.call(row.cells, function (cell) {
      if (!once(cell)) return;
      var spot = model.place.get(cell);
      if (!spot || spot.rs < 2) return;
      var next = model.rows[at + 1];
      if (spot.rs === 2) cell.removeAttribute("rowspan");
      else cell.setAttribute("rowspan", String(spot.rs - 1));
      if (next) moveCell(next, cell, spot.c, model);
    });
    for (var c = 0; c < model.cols; c++) {
      var cell = model.grid[at][c];
      if (!once(cell)) continue;
      var spot = model.place.get(cell);
      if (!spot || spot.rs < 2) continue;
      if (spot.rs === 2) cell.removeAttribute("rowspan");
      else cell.setAttribute("rowspan", String(spot.rs - 1));
    }
    row.remove();
    return true;
  }

  function cellParts(cell, r, c) {
    var raw = cell.getAttribute("data-wd-merge");
    if (raw) {
      try {
        var saved = JSON.parse(decodeURIComponent(raw));
        return saved.map(function (part) {
          return { r: r + part.r, c: c + part.c, html: part.html, tag: part.tag };
        });
      } catch (error) { /* keep the cell as it is now */ }
    }
    return [{ r: r, c: c, html: cell.innerHTML, tag: cell.tagName.toLowerCase() }];
  }

  function mergeRect(table, r1, c1, r2, c2) {
    if (r2 < r1 || c2 < c1 || (r1 === r2 && c1 === c2)) return null;
    var model = gridOf(table);
    var keeper = model.grid[r1] && model.grid[r1][c1];
    if (!keeper) return null;
    var seen = [];
    var parts = [];
    for (var r = r1; r <= r2; r++) {
      for (var c = c1; c <= c2; c++) {
        var cell = model.grid[r] && model.grid[r][c];
        if (!cell || seen.indexOf(cell) !== -1) continue;
        seen.push(cell);
        var spot = model.place.get(cell);
        if (!spot || spot.r < r1 || spot.c < c1 || spot.r + spot.rs - 1 > r2 || spot.c + spot.cs - 1 > c2) return null;
        cellParts(cell, spot.r - r1, spot.c - c1).forEach(function (part) { parts.push(part); });
      }
    }
    var rs = r2 - r1 + 1;
    var cs = c2 - c1 + 1;
    if (cs > 1) keeper.setAttribute("colspan", String(cs));
    else keeper.removeAttribute("colspan");
    if (rs > 1) keeper.setAttribute("rowspan", String(rs));
    else keeper.removeAttribute("rowspan");
    var shown = parts.filter(function (part) {
      var holder = document.createElement("div");
      holder.innerHTML = part.html;
      return holder.textContent.trim();
    }).map(function (part) { return part.html; });
    keeper.innerHTML = shown.join(" ");
    keeper.setAttribute("data-wd-merge", encodeURIComponent(JSON.stringify(parts)));
    seen.forEach(function (cell) { if (cell !== keeper) cell.remove(); });
    return keeper;
  }

  function mergeToward(cell, down) {
    var table = cell.closest("table");
    var model = gridOf(table);
    var spot = model.place.get(cell);
    if (!spot) return null;
    var neighbor = down
      ? (model.grid[spot.r + spot.rs] && model.grid[spot.r + spot.rs][spot.c])
      : model.grid[spot.r][spot.c + spot.cs];
    if (!neighbor || neighbor === cell) return null;
    var next = model.place.get(neighbor);
    if (!next) return null;
    return mergeRect(
      table,
      Math.min(spot.r, next.r),
      Math.min(spot.c, next.c),
      Math.max(spot.r + spot.rs, next.r + next.rs) - 1,
      Math.max(spot.c + spot.cs, next.c + next.cs) - 1
    );
  }

  function markBounds(table) {
    var model = gridOf(table);
    var r1 = 999;
    var c1 = 999;
    var r2 = 0;
    var c2 = 0;
    marks.forEach(function (cell) {
      var spot = model.place.get(cell);
      if (!spot) return;
      if (spot.r < r1) r1 = spot.r;
      if (spot.c < c1) c1 = spot.c;
      if (spot.r + spot.rs - 1 > r2) r2 = spot.r + spot.rs - 1;
      if (spot.c + spot.cs - 1 > c2) c2 = spot.c + spot.cs - 1;
    });
    return { r1: r1, c1: c1, r2: r2, c2: c2 };
  }

  function unmerge(cell) {
    var table = cell.closest("table");
    var model = gridOf(table);
    var spot = model.place.get(cell);
    if (!spot || (spot.cs === 1 && spot.rs === 1)) return;
    var parts = [];
    var raw = cell.getAttribute("data-wd-merge");
    if (raw) {
      try { parts = JSON.parse(decodeURIComponent(raw)); } catch (error) { parts = []; }
    }
    cell.removeAttribute("data-wd-merge");
    cell.removeAttribute("colspan");
    cell.removeAttribute("rowspan");
    var origin = null;
    parts.forEach(function (part) { if (part.r === 0 && part.c === 0) origin = part; });
    if (origin) cell.innerHTML = origin.html;
    for (var r = spot.r; r < spot.r + spot.rs; r++) {
      for (var c = spot.c; c < spot.c + spot.cs; c++) {
        if (r === spot.r && c === spot.c) continue;
        if (!model.rows[r]) continue;
        var made = insertCellAt(model.rows[r], c, model);
        var part = null;
        parts.forEach(function (item) {
          if (item.r === r - spot.r && item.c === c - spot.c) part = item;
        });
        if (!part) continue;
        if (part.tag && part.tag !== made.tagName.toLowerCase()) {
          var swapped = document.createElement(part.tag);
          made.replaceWith(swapped);
          made = swapped;
        }
        made.innerHTML = part.html;
      }
    }
  }

  function columnBox(model, c) {
    for (var r = 0; r < model.rows.length; r++) {
      var cell = model.grid[r] && model.grid[r][c];
      var spot = cell && model.place.get(cell);
      if (!spot) continue;
      var rect = cell.getBoundingClientRect();
      var width = rect.width / spot.cs;
      return { left: rect.left + (c - spot.c) * width, width: width, top: rect.top };
    }
    return null;
  }

  function chromeButton(title, on) {
    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-wd-ui", "1");
    button.title = title;
    button.textContent = title.replace(/\\D/g, "") || "•";
    button.style.cssText = "position:fixed;pointer-events:auto;width:22px;height:22px;border-radius:6px;border:1px solid #0f766e;padding:0;font:700 11px/20px sans-serif;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.2);background:" + (on ? "#0f766e" : "#ffffff") + ";color:" + (on ? "#ffffff" : "#0f766e") + ";z-index:2147483647;";
    return button;
  }

  function ensureTableUi() {
    if (tableUi && tableUi.isConnected) return tableUi;
    tableUi = document.createElement("div");
    tableUi.setAttribute("data-wd-ui", "1");
    tableUi.id = "wd-table";
    tableUi.style.cssText = "position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;";
    document.body.appendChild(tableUi);
    return tableUi;
  }

  function wholeMarked(model) {
    if (!marks.length || !model.rows.length || !model.cols) return false;
    for (var r = 0; r < model.rows.length; r++) {
      for (var c = 0; c < model.cols; c++) {
        var cell = model.grid[r] && model.grid[r][c];
        if (cell && marks.indexOf(cell) === -1) return false;
      }
    }
    return true;
  }

  function selectTable(table) {
    var model = gridOf(table);
    if (!model.rows.length || !model.cols) return;
    var start = null;
    var end = null;
    for (var c = 0; c < model.cols && !start; c++) start = model.grid[0] && model.grid[0][c];
    var last = model.grid[model.rows.length - 1];
    if (last) {
      for (var c2 = model.cols - 1; c2 >= 0 && !end; c2--) end = last[c2];
    }
    if (start && end) selectSpan(start, end);
    emit("table-window");
  }

  function coversRow(model, r) {
    if (!marks.length) return false;
    for (var c = 0; c < model.cols; c++) {
      var cell = model.grid[r] && model.grid[r][c];
      if (cell && marks.indexOf(cell) === -1) return false;
    }
    return model.cols > 0;
  }

  function coversColumn(model, c) {
    if (!marks.length) return false;
    for (var r = 0; r < model.rows.length; r++) {
      var cell = model.grid[r] && model.grid[r][c];
      if (cell && marks.indexOf(cell) === -1) return false;
    }
    return model.rows.length > 0;
  }

  function onChromeClick(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    var button = event.currentTarget;
    var table = selected && selected.closest ? selected.closest("table") : null;
    if (!table) return;
    if (button.getAttribute("data-table") === "all") {
      selectTable(table);
      return;
    }
    var col = button.getAttribute("data-col");
    var row = button.getAttribute("data-row");
    if (col !== null) {
      var colIndex = parseInt(col, 10);
      if (event.shiftKey && anchorCol >= 0) selectCols(table, anchorCol, colIndex);
      else selectColumn(table, colIndex);
      dragSelect = { kind: "col", index: anchorCol >= 0 ? anchorCol : colIndex, table: table, moved: false };
    }
    if (row !== null) {
      var rowIndex = parseInt(row, 10);
      if (event.shiftKey && anchorRow >= 0) selectRows(table, anchorRow, rowIndex);
      else selectRow(table, rowIndex);
      dragSelect = { kind: "row", index: anchorRow >= 0 ? anchorRow : rowIndex, table: table, moved: false };
    }
  }

  function placeTableChrome() {
    var table = selected && selected.closest ? selected.closest("table") : null;
    if (!table) {
      if (tableUi) tableUi.textContent = "";
      return;
    }
    var ui = ensureTableUi();
    ui.textContent = "";
    var model = gridOf(table);
    var ar = document.documentElement.lang === "ar";
    var rtl = document.documentElement.dir === "rtl";
    var bounds = table.getBoundingClientRect();
    var all = chromeButton(ar ? "تحديد الجدول" : "Select table", wholeMarked(model));
    all.textContent = "";
    all.innerHTML = '<svg data-wd-ui="1" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1.5 6h13M1.5 10.5h13M6 1.5v13M10.5 1.5v13" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
    all.setAttribute("data-table", "all");
    all.style.display = "flex";
    all.style.alignItems = "center";
    all.style.justifyContent = "center";
    var ax = rtl ? bounds.right + 6 : bounds.left - 28;
    if (!rtl && ax < 2) ax = 2;
    if (rtl && ax > window.innerWidth - 24) ax = window.innerWidth - 24;
    all.style.left = ax + "px";
    all.style.top = Math.max(4, bounds.top - 26) + "px";
    all.addEventListener("pointerdown", onChromeClick);
    ui.appendChild(all);
    for (var c = 0; c < model.cols; c++) {
      var box = columnBox(model, c);
      if (!box || box.width < 8) continue;
      var button = chromeButton((ar ? "العمود " : "Column ") + (c + 1), coversColumn(model, c));
      button.style.left = (box.left + box.width / 2 - 11) + "px";
      button.style.top = Math.max(4, box.top - 26) + "px";
      button.setAttribute("data-col", String(c));
      button.addEventListener("pointerdown", onChromeClick);
      ui.appendChild(button);
    }
    for (var r = 0; r < model.rows.length; r++) {
      var row = model.rows[r];
      var rect = row.getBoundingClientRect();
      if (rect.height < 8) continue;
      var button = chromeButton((ar ? "الصف " : "Row ") + (r + 1), coversRow(model, r));
      var x = rtl ? rect.right + 6 : rect.left - 28;
      if (!rtl && x < 2) x = Math.max(2, rect.left - 22);
      if (rtl && x > window.innerWidth - 24) x = Math.min(window.innerWidth - 24, rect.right);
      button.style.left = x + "px";
      button.style.top = (rect.top + rect.height / 2 - 11) + "px";
      button.setAttribute("data-row", String(r));
      button.addEventListener("pointerdown", onChromeClick);
      ui.appendChild(button);
    }
  }

  var edgeDrag = null;
  var ignoreEdgeClick = false;

  function edgeGuide() {
    var line = document.getElementById("wd-edge");
    if (line) return line;
    line = document.createElement("div");
    line.id = "wd-edge";
    line.setAttribute("data-wd-ui", "1");
    line.style.cssText = "position:fixed;z-index:2147483647;display:none;pointer-events:none;background:#1a6fb5;";
    document.body.appendChild(line);
    return line;
  }

  function placeGuide(kind, x, y, span) {
    var line = edgeGuide();
    line.style.display = "block";
    if (kind === "col") {
      line.style.left = (x - 1) + "px";
      line.style.top = y + "px";
      line.style.width = "2px";
      line.style.height = span + "px";
    } else {
      line.style.left = x + "px";
      line.style.top = (y - 1) + "px";
      line.style.width = span + "px";
      line.style.height = "2px";
    }
  }

  function hideGuide() {
    var line = document.getElementById("wd-edge");
    if (line) line.style.display = "none";
  }

  function sizeTip(text, x, y) {
    var tip = document.getElementById("wd-size-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "wd-size-tip";
      tip.setAttribute("data-wd-ui", "1");
      tip.style.cssText = "position:fixed;z-index:2147483647;display:none;pointer-events:none;background:#1a1a1a;color:#fff;font:12px/1.2 Segoe UI,Tahoma,sans-serif;padding:3px 6px;";
      document.body.appendChild(tip);
    }
    tip.textContent = text;
    tip.style.display = "block";
    tip.style.left = (x + 14) + "px";
    tip.style.top = (y + 14) + "px";
  }

  function hideTip() {
    var tip = document.getElementById("wd-size-tip");
    if (tip) tip.style.display = "none";
  }

  function setEdgeCursor(kind) {
    document.body.classList.remove("wd-col-resize");
    document.body.classList.remove("wd-row-resize");
    if (kind === "col") document.body.classList.add("wd-col-resize");
    if (kind === "row") document.body.classList.add("wd-row-resize");
  }

  function hitTableEdge(table, x, y) {
    var bounds = table.getBoundingClientRect();
    if (x < bounds.left - 4 || x > bounds.right + 4 || y < bounds.top - 4 || y > bounds.bottom + 4) return null;
    var model = gridOf(table);
    var reach = 8;
    var colHit = null;
    for (var c = 0; c < model.cols; c++) {
      var box = columnBox(model, c);
      if (!box) continue;
      var edge = box.left + box.width;
      var dist = Math.abs(x - edge);
      if (dist <= reach && (!colHit || dist < colHit.dist)) {
        var rightCol = null;
        for (var n = 0; n < model.cols; n++) {
          var other = columnBox(model, n);
          if (other && Math.abs(other.left - edge) <= 10) rightCol = n;
        }
        colHit = { dist: dist, kind: "col", leftCol: c, rightCol: rightCol, x: edge, top: bounds.top, span: bounds.height };
      }
    }
    var rowHit = null;
    for (var r = 0; r < model.rows.length; r++) {
      var rect = model.rows[r].getBoundingClientRect();
      var rowDist = Math.abs(y - rect.bottom);
      if (rowDist <= reach && (!rowHit || rowDist < rowHit.dist)) {
        rowHit = { dist: rowDist, kind: "row", row: r, y: rect.bottom, left: bounds.left, span: bounds.width };
      }
    }
    if (colHit && rowHit) return colHit.dist <= rowHit.dist ? colHit : rowHit;
    return colHit || rowHit;
  }

  function lockColumns(table) {
    var model = gridOf(table);
    var group = table.querySelector("colgroup");
    if (!group) {
      group = document.createElement("colgroup");
      var caption = table.querySelector("caption");
      if (caption) caption.after(group);
      else table.insertBefore(group, table.firstChild);
    }
    while (group.children.length < model.cols) group.appendChild(document.createElement("col"));
    while (group.children.length > model.cols) group.removeChild(group.lastChild);
    var widths = [];
    var sum = 0;
    for (var c = 0; c < model.cols; c++) {
      var box = columnBox(model, c);
      var width = box ? Math.max(36, Math.round(box.width)) : 72;
      widths.push(width);
      sum += width;
    }
    for (var i = 0; i < model.cols; i++) group.children[i].style.width = widths[i] + "px";
    table.style.tableLayout = "fixed";
    table.style.width = sum + "px";
    var seen = [];
    for (var r = 0; r < model.rows.length; r++) {
      for (var col = 0; col < model.cols; col++) {
        var cell = model.grid[r] && model.grid[r][col];
        if (!cell || seen.indexOf(cell) !== -1) continue;
        seen.push(cell);
        cell.style.width = "";
      }
    }
    return group;
  }

  function columnWidths(group) {
    var widths = [];
    for (var i = 0; i < group.children.length; i++) widths.push(parseFloat(group.children[i].style.width) || 36);
    return widths;
  }

  function writeColumnWidths(table, group, widths) {
    var sum = 0;
    for (var i = 0; i < widths.length; i++) {
      var width = Math.max(36, Math.round(widths[i]));
      widths[i] = width;
      group.children[i].style.width = width + "px";
      sum += width;
    }
    table.style.width = sum + "px";
  }

  function setRowHeight(row, px) {
    var height = Math.max(24, Math.round(px)) + "px";
    row.style.boxSizing = "border-box";
    row.style.height = height;
    Array.prototype.forEach.call(row.cells, function (cell) {
      if (spanCount(cell, "rowspan") > 1) return;
      cell.style.boxSizing = "border-box";
      cell.style.height = height;
    });
  }

  function readSize(value) {
    var match = /^(\\d+(?:\\.\\d+)?)(px|%)$/.exec(String(value || "").replace(/\\s/g, ""));
    if (!match) return null;
    return { num: Number(match[1]), unit: match[2] };
  }

  function setTableWidth(table, value) {
    var parsed = readSize(value);
    if (!parsed) {
      table.style.width = "";
      return;
    }
    var group = table.querySelector("colgroup");
    var count = group ? group.children.length : 0;
    if (parsed.unit === "px") {
      var target = Math.max(count ? count * 36 : 80, Math.round(parsed.num));
      if (count) {
        var widths = columnWidths(group);
        var sum = 0;
        widths.forEach(function (width) { sum += width; });
        if (!sum) sum = target;
        var next = widths.map(function (width) { return Math.max(36, Math.round(width * target / sum)); });
        var drift = target - next.reduce(function (total, width) { return total + width; }, 0);
        next[next.length - 1] = Math.max(36, next[next.length - 1] + drift);
        writeColumnWidths(table, group, next);
        return;
      }
      table.style.width = target + "px";
      return;
    }
    var percent = Math.max(10, Math.min(100, Math.round(parsed.num)));
    if (count) {
      var current = columnWidths(group);
      var base = 0;
      current.forEach(function (width) { base += width; });
      if (!base) base = count;
      for (var i = 0; i < count; i++) group.children[i].style.width = (current[i] / base * 100) + "%";
      table.style.tableLayout = "fixed";
    }
    table.style.width = percent + "%";
  }

  function setTableHeight(table, value) {
    var parsed = readSize(value);
    if (!parsed) {
      table.style.height = "";
      return;
    }
    if (parsed.unit === "%") {
      table.style.height = Math.max(10, Math.min(100, Math.round(parsed.num))) + "%";
      return;
    }
    var rows = Array.prototype.slice.call(table.rows);
    var target = Math.max(Math.max(rows.length, 1) * 24, Math.round(parsed.num));
    if (!rows.length) {
      table.style.height = target + "px";
      return;
    }
    var heights = rows.map(function (row) { return Math.max(24, Math.round(row.getBoundingClientRect().height)); });
    var sum = heights.reduce(function (total, height) { return total + height; }, 0) || target;
    var used = 0;
    rows.forEach(function (row, index) {
      var next = index === rows.length - 1 ? Math.max(24, target - used) : Math.max(24, Math.round(heights[index] * target / sum));
      if (index < rows.length - 1) used += next;
      setRowHeight(row, next);
    });
    table.style.boxSizing = "border-box";
    table.style.height = target + "px";
  }

  function tableFills(table) {
    var parent = table.parentElement;
    if (!parent) return true;
    var view = table.ownerDocument.defaultView;
    var pad = view.getComputedStyle(parent);
    var inner = parent.clientWidth - (parseFloat(pad.paddingLeft) || 0) - (parseFloat(pad.paddingRight) || 0);
    return table.getBoundingClientRect().width >= inner - 8;
  }

  function keptMargin(table, prop) {
    var value = table.style[prop];
    if (value && value !== "auto") return value;
    return "0";
  }

  function setTableAlign(table, align) {
    var width = table.style.width;
    var full = !width || width === "100%" || tableFills(table);
    if ((align === "center" || align === "right") && full) {
      setTableWidth(table, "70%");
    }
    table.style.float = "none";
    if (align === "center") {
      table.style.marginLeft = "auto";
      table.style.marginRight = "auto";
    } else if (align === "right") {
      table.style.marginLeft = "auto";
      table.style.marginRight = keptMargin(table, "marginRight");
    } else {
      table.style.marginLeft = keptMargin(table, "marginLeft");
      table.style.marginRight = "auto";
    }
  }

  function setTableMargin(table, side, value) {
    var prop = { top: "marginTop", right: "marginRight", bottom: "marginBottom", left: "marginLeft" }[side];
    if (!prop) return;
    if (value === "auto") {
      table.style[prop] = "auto";
      return;
    }
    var n = parseFloat(value);
    if (!isFinite(n) || n < 0) return;
    table.style[prop] = Math.round(Math.min(800, n)) + "px";
  }

  function fitRows(table, count) {
    var want = Math.max(1, Math.min(30, Math.round(parseFloat(count) || 1)));
    var guard = 0;
    while (table.rows.length < want && guard < 30) {
      insertRowAt(table, table.rows.length);
      guard += 1;
    }
    guard = 0;
    while (table.rows.length > want && guard < 30) {
      if (!deleteRow(table, table.rows.length - 1)) break;
      guard += 1;
    }
  }

  function fitCols(table, count) {
    var want = Math.max(1, Math.min(20, Math.round(parseFloat(count) || 1)));
    var guard = 0;
    while (gridOf(table).cols < want && guard < 20) {
      insertColumn(table, gridOf(table).cols);
      guard += 1;
    }
    guard = 0;
    while (gridOf(table).cols > want && guard < 20) {
      if (!deleteColumn(table, gridOf(table).cols - 1)) break;
      guard += 1;
    }
  }

  function setTableBorder(table, size, color) {
    var px = Math.max(0, Math.min(12, Math.round(parseFloat(size) || 0)));
    var paint = color || "#d6d3d1";
    var rule = px ? px + "px solid " + paint : "none";
    table.style.border = rule;
    Array.prototype.forEach.call(table.querySelectorAll("th, td"), function (item) {
      item.style.border = rule;
    });
  }

  function setCellPad(table, value) {
    var px = Math.max(0, Math.min(48, Math.round(parseFloat(value) || 0)));
    Array.prototype.forEach.call(table.querySelectorAll("th, td"), function (item) {
      item.style.padding = px + "px";
    });
  }

  function setSpacing(table, value) {
    var px = Math.max(0, Math.min(40, Math.round(parseFloat(value) || 0)));
    table.style.borderCollapse = px ? "separate" : "collapse";
    table.style.borderSpacing = px + "px";
  }

  function paintList(cell) {
    if (marks.length) return marks.slice();
    return cell ? [cell] : [];
  }

  function setColumnWidth(table, index, px, every) {
    var group = lockColumns(table);
    var width = Math.max(36, Math.round(parseFloat(px) || 36));
    var widths = columnWidths(group);
    if (every) {
      for (var i = 0; i < widths.length; i++) widths[i] = width;
    } else if (index >= 0 && index < widths.length) widths[index] = width;
    writeColumnWidths(table, group, widths);
  }

  function setRowsHeight(table, px, every, index) {
    var height = Math.max(24, Math.round(parseFloat(px) || 24));
    if (every) {
      Array.prototype.forEach.call(table.rows, function (row) { setRowHeight(row, height); });
      table.style.boxSizing = "border-box";
      table.style.height = (height * table.rows.length) + "px";
      return;
    }
    var row = table.rows[index];
    if (!row) return;
    setRowHeight(row, height);
    var total = 0;
    Array.prototype.forEach.call(table.rows, function (item) {
      total += Math.round(item.getBoundingClientRect().height);
    });
    if (total) {
      table.style.boxSizing = "border-box";
      table.style.height = total + "px";
    }
  }

  function alignCells(list, prop, value) {
    list.forEach(function (item) { item.style[prop] = value; });
  }

  function finishEdgeDrag() {
    window.removeEventListener("pointermove", moveEdge);
    window.removeEventListener("pointerup", finishEdgeDrag);
    setEdgeCursor(null);
    hideGuide();
    hideTip();
    var drag = edgeDrag;
    edgeDrag = null;
    if (!drag) return;
    if (drag.kind === "row" && drag.table.style.height) {
      var total = 0;
      Array.prototype.forEach.call(drag.table.rows, function (row) {
        total += Math.round(row.getBoundingClientRect().height);
      });
      if (total) drag.table.style.height = total + "px";
    }
    ignoreEdgeClick = true;
    emitHtml();
    if (selected) describe(selected);
    placeTableChrome();
  }

  function moveEdge(event) {
    var drag = edgeDrag;
    if (!drag) return;
    var bounds = drag.table.getBoundingClientRect();
    if (drag.kind === "col") {
      var dx = event.clientX - drag.startX;
      var widths = drag.widths.slice();
      if (drag.rightCol === null || drag.rightCol === undefined) {
        widths[drag.leftCol] = Math.max(36, drag.widths[drag.leftCol] + dx);
      } else {
        var pair = drag.widths[drag.leftCol] + drag.widths[drag.rightCol];
        var next = Math.max(36, Math.min(pair - 36, drag.widths[drag.leftCol] + dx));
        widths[drag.leftCol] = next;
        widths[drag.rightCol] = pair - next;
      }
      writeColumnWidths(drag.table, drag.group, widths);
      placeGuide("col", event.clientX, bounds.top, bounds.height);
      sizeTip(Math.round(widths[drag.leftCol]) + " px", event.clientX, event.clientY);
    } else {
      var height = Math.max(24, drag.startH + (event.clientY - drag.startY));
      setRowHeight(drag.row, height);
      placeGuide("row", bounds.left, event.clientY, bounds.width);
      sizeTip(Math.round(height) + " px", event.clientX, event.clientY);
    }
    placeTableChrome();
  }

  function startEdgeDrag(event, table, hit) {
    event.preventDefault();
    event.stopPropagation();
    try { document.documentElement.setPointerCapture(event.pointerId); } catch (error) { /* the drag still follows the pointer inside the page */ }
    if (hit.kind === "col") {
      var group = lockColumns(table);
      var widths = columnWidths(group);
      edgeDrag = {
        kind: "col",
        table: table,
        group: group,
        leftCol: hit.leftCol,
        rightCol: hit.rightCol,
        widths: widths,
        startX: event.clientX
      };
      setEdgeCursor("col");
    } else {
      var row = table.rows[hit.row];
      if (!row) return;
      edgeDrag = {
        kind: "row",
        table: table,
        row: row,
        startY: event.clientY,
        startH: row.getBoundingClientRect().height
      };
      setEdgeCursor("row");
    }
    window.addEventListener("pointermove", moveEdge);
    window.addEventListener("pointerup", finishEdgeDrag);
  }

  document.addEventListener("mousemove", function (event) {
    if (edgeDrag || dragSelect) return;
    var node = event.target;
    if (!node || !node.closest || node.closest("[data-wd-ui]")) {
      setEdgeCursor(null);
      hideGuide();
      return;
    }
    var table = node.closest("table");
    var hit = table && hitTableEdge(table, event.clientX, event.clientY);
    setEdgeCursor(hit ? hit.kind : null);
    if (!hit) hideGuide();
    else placeGuide(hit.kind, hit.kind === "col" ? hit.x : hit.left, hit.kind === "col" ? hit.top : hit.y, hit.span);
  });

  function rowAtPoint(table, y) {
    var rows = table.rows;
    if (!rows.length) return -1;
    for (var r = 0; r < rows.length; r++) {
      var rect = rows[r].getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) return r;
    }
    var first = rows[0].getBoundingClientRect();
    var last = rows[rows.length - 1].getBoundingClientRect();
    if (y < first.top) return 0;
    if (y > last.bottom) return rows.length - 1;
    return -1;
  }

  function colAtPoint(table, x) {
    var model = gridOf(table);
    var found = -1;
    var best = 100000;
    for (var c = 0; c < model.cols; c++) {
      var box = columnBox(model, c);
      if (!box) continue;
      if (x >= box.left && x <= box.left + box.width) return c;
      var dist = Math.abs(x - (box.left + box.width / 2));
      if (dist < best) { best = dist; found = c; }
    }
    return found;
  }

  function cellAtPoint(table, x, y) {
    var under = document.elementFromPoint(x, y);
    var direct = cellOf(under);
    if (direct && direct.closest("table") === table) return direct;
    var r = rowAtPoint(table, y);
    var c = colAtPoint(table, x);
    if (r < 0 || c < 0) return null;
    var model = gridOf(table);
    return (model.grid[r] && model.grid[r][c]) || null;
  }

  function moveChoose(event) {
    if (!dragSelect || !dragSelect.table.isConnected) return;
    var table = dragSelect.table;
    if (dragSelect.kind === "cells") {
      var cell = cellAtPoint(table, event.clientX, event.clientY);
      if (!cell || cell === dragSelect.anchor || cell.closest("table") !== table) return;
      dragSelect.moved = true;
      choosing = true;
      document.body.classList.add("wd-choosing");
      if (window.getSelection) {
        var picked = window.getSelection();
        if (picked) picked.removeAllRanges();
      }
      selectSpan(dragSelect.anchor, cell);
      return;
    }
    var at = dragSelect.kind === "row" ? rowAtPoint(table, event.clientY) : colAtPoint(table, event.clientX);
    if (at < 0 || at === dragSelect.index) return;
    dragSelect.moved = true;
    choosing = true;
    document.body.classList.add("wd-choosing");
    if (dragSelect.kind === "row") selectRows(table, dragSelect.index, at);
    else selectCols(table, dragSelect.index, at);
  }

  function endChoose() {
    if (!dragSelect) return;
    var moved = dragSelect.moved;
    dragSelect = null;
    choosing = false;
    document.body.classList.remove("wd-choosing");
    if (!moved) return;
    ignoreEdgeClick = true;
    placeTableChrome();
    if (selected) describe(selected);
  }

  document.addEventListener("pointerdown", function (event) {
    if (event.button !== 0 || edgeDrag || dragSelect) return;
    var node = event.target;
    if (!node || !node.closest || node.closest("[data-wd-ui]")) return;
    if (node.closest("[contenteditable='true']")) return;
    var table = node.closest("table");
    if (!table) return;
    var hit = hitTableEdge(table, event.clientX, event.clientY);
    if (hit) {
      startEdgeDrag(event, table, hit);
      return;
    }
    var cell = cellOf(node);
    if (!cell) return;
    var anchor = cell;
    if (event.shiftKey) {
      var current = cellOf(selected);
      if (current && current.closest("table") === table) anchor = current;
    }
    dragSelect = { kind: "cells", anchor: anchor, table: table, moved: false };
  }, true);
  window.addEventListener("pointermove", moveChoose);
  window.addEventListener("pointerup", endChoose);
  window.addEventListener("pointercancel", endChoose);

  document.addEventListener("click", function (event) {
    if (!ignoreEdgeClick) return;
    ignoreEdgeClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  function visualColumn(spot, side) {
    var rtl = document.documentElement.dir === "rtl";
    var toRight = side === "right";
    if (rtl) toRight = !toRight;
    if (tableScope === "col" && scopeIndex >= 0) return toRight ? scopeIndex + 1 : scopeIndex;
    return toRight ? spot.c + spot.cs : spot.c;
  }

  var openedMenu = false;

  document.addEventListener("contextmenu", function (event) {
    var node = event.target;
    if (!node || !node.closest || node.closest("[data-wd-ui]")) return;
    event.preventDefault();
    openedMenu = true;
    var el = node.closest("body *");
    if (!el || el === document.body) {
      select(null);
      emit("menu", { x: event.clientX, y: event.clientY });
      return;
    }
    var cell = cellOf(el);
    var link = el.closest("a");
    var image = el.tagName === "IMG" ? el : null;
    if (cell && marks.indexOf(cell) !== -1) select(cell, true);
    else select(image || link || cell || el);
    emit("menu", { x: event.clientX, y: event.clientY });
  });

  document.addEventListener("click", function (event) {
    if (openedMenu) {
      openedMenu = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    emit("dismiss");
    var link = event.target.closest && event.target.closest("a");
    if (link) event.preventDefault();
    if (event.target.closest && event.target.closest("[data-wd-ui]")) return;
    if (event.shiftKey) {
      var cell = event.target.closest && event.target.closest("td,th");
      var anchor = cellOf(selected);
      if (cell && anchor && cell.closest("table") === anchor.closest("table")) {
        event.preventDefault();
        selectSpan(anchor, cell);
        return;
      }
    }
    var el = event.target.closest ? event.target.closest("body *") : null;
    if (!el || el === document.body) { select(null); return; }
    select(el);
  });

  document.addEventListener("dblclick", function (event) {
    var el = event.target.closest && event.target.closest("body *");
    if (!el) return;
    if (!/^(H[1-6]|P|LI|A|BUTTON|BLOCKQUOTE|TH|TD|SPAN|LABEL|FIGCAPTION|SUMMARY|EM|STRONG|SMALL|H1)$/.test(el.tagName) && el.childElementCount > 0) return;
    if (el.childElementCount > 0 && !/^(TD|TH|LI|A|BUTTON)$/.test(el.tagName)) return;
    el.contentEditable = "true";
    el.focus();
    var done = function () {
      el.removeAttribute("contenteditable");
      el.removeEventListener("blur", done);
      emitHtml();
      if (selected === el) describe(el);
    };
    el.addEventListener("blur", done);
  });

  document.addEventListener("paste", function (event) {
    var typing = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute("contenteditable") === "true";
    if (typing) return;
    var data = event.clipboardData;
    if (!data) return;
    if (data.files && data.files.length) return;
    var html = data.getData("text/html") || "";
    var text = data.getData("text/plain") || "";
    var raw = html || text;
    if (!raw) return;
    event.preventDefault();
    if (raw.indexOf("<") < 0) raw = "<p>" + text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</p>";
    insertHtml(raw, selected ? pathOf(selected) : null, selected ? selected.tagName.toLowerCase() : "");
  });

  document.addEventListener("submit", function (event) { event.preventDefault(); }, true);

  document.addEventListener("dragover", function (event) {
    var types = event.dataTransfer ? Array.prototype.slice.call(event.dataTransfer.types) : [];
    if (types.indexOf("text/plain") === -1 && types.indexOf("Files") === -1) return;
    event.preventDefault();
    var el = event.target.closest ? event.target.closest("body *") : null;
    if (hover && hover !== el) hover.classList.remove("wd-hover");
    hover = el;
    if (el) el.classList.add("wd-hover");
  });

  document.addEventListener("dragleave", function () {
    if (hover) hover.classList.remove("wd-hover");
    hover = null;
  });

  document.addEventListener("drop", function (event) {
    var raw = event.dataTransfer.getData("text/plain") || "";
    var files = Array.prototype.slice.call(event.dataTransfer.files || []).filter(function (file) {
      return file.type.indexOf("image/") === 0;
    });
    if (raw.indexOf("wd-block:") !== 0 && raw.indexOf("wd-image:") !== 0 && !files.length) return;
    event.preventDefault();
    if (hover) hover.classList.remove("wd-hover");
    hover = null;
    var el = event.target.closest ? event.target.closest("body *") : null;
    var path = el ? pathOf(el) : [];
    var tag = el ? el.tagName.toLowerCase() : "body";
    if (files.length) emit("files", { path: path, tag: tag, files: files });
    else emit("drop", { token: raw, path: path, tag: tag });
  });

  document.addEventListener("mouseover", function (event) {
    var el = event.target.closest ? event.target.closest("body *") : null;
    paintBox(el);
  });

  document.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      var key = event.key.toLowerCase();
      var typing = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute("contenteditable") === "true";
      if (key === "b" || key === "i" || key === "u") {
        event.preventDefault();
        document.execCommand(key === "b" ? "bold" : key === "i" ? "italic" : "underline");
        emitHtml();
        if (selected) describe(selected);
      }
      if (!typing && key === "a") { event.preventDefault(); selectAll(); }
      if (!typing && (key === "c" || key === "x")) {
        var html = selectionMarkup();
        if (!html) return;
        event.preventDefault();
        publishClip(html);
        if (key === "x") removeSelection();
      }
      if (key === "f" || key === "h") { event.preventDefault(); emit("find-open", { replace: key === "h" }); }
    }
    if ((event.key === "Delete" || event.key === "Backspace") && selected && selected.getAttribute("contenteditable") !== "true") {
      var typingNow = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute("contenteditable") === "true";
      if (typingNow) return;
      var marked = pageNodes().filter(function (node) { return node.classList.contains("wd-selected"); });
      if (marked.length > 1) { event.preventDefault(); removeSelection(); return; }
      var held = selected.closest && selected.closest("table");
      if (held && marks.length && held.querySelectorAll("td, th").length === marks.length) {
        var every = true;
        held.querySelectorAll("td, th").forEach(function (cell) { if (marks.indexOf(cell) === -1) every = false; });
        if (every) {
          event.preventDefault();
          var holder = held.parentElement;
          held.remove();
          emitHtml();
          select(holder && holder !== document.body ? holder : null);
          return;
        }
      }
      event.preventDefault();
      var parent = selected.parentElement;
      selected.remove();
      emitHtml();
      select(parent && parent !== document.body ? parent : null);
    }
  });

  window.addEventListener("message", function (event) {
    var message = event.data;
    if (!message || message.source !== "wd-parent") return;
    var el = message.path ? elAt(message.path) : selected;
    if (message.cmd === "xray") {
      document.body.classList.toggle("wd-xray", !!message.on);
      if (!message.on && box) box.style.display = "none";
    }
    if (message.cmd === "html") {
      cleanup(document.body);
      document.body.innerHTML = message.html;
      selected = null;
      clearMarks();
      placeHandles();
      emit("select", { path: null });
    }
    if (message.cmd === "css") {
      var style = document.getElementById("wd-user");
      if (style) style.textContent = message.css;
    }
    if (message.cmd === "select") select(message.path ? elAt(message.path) : null);
    if (message.cmd === "flush") {
      var active = document.activeElement;
      if (active && active !== document.body && active.blur) active.blur();
      emitHtml();
    }
    if (message.cmd === "select-all") { selectAll(); return; }
    if (message.cmd === "clear-body") { removeSelection(); return; }
    if (message.cmd === "find") {
      emit("found", { ok: findText(message.query, !!message.again), kind: "find" });
      return;
    }
    if (message.cmd === "replace") {
      var count = replaceText(message.query, message.value || "", !!message.all);
      emit("found", { ok: count > 0, count: count, kind: "replace" });
      return;
    }
    if (!el || el === document.body) {
      if (message.cmd === "insert") insertHtml(message.html, message.path, message.tag || "");
      return;
    }
    if (message.cmd === "style") {
      el.style[message.prop] = message.value || "";
      emitHtml();
      describe(el);
      placeHandles();
    }
    if (message.cmd === "style-live") {
      el.style[message.prop] = message.value || "";
      if (message.prop2) el.style[message.prop2] = message.value2 || "";
      placeHandles();
    }
    if (message.cmd === "styles") {
      var props = message.props || {};
      Object.keys(props).forEach(function (key) { el.style[key] = props[key] || ""; });
      emitHtml();
      describe(el);
      placeHandles();
    }
    if (message.cmd === "picture-row") {
      var img = el.tagName === "IMG" ? el : el.querySelector("img");
      if (!img) return;
      layoutPictures(img, message.width || "48%", message.valign || "top");
      emitHtml();
      describe(img.tagName === "IMG" && selected === img ? img : el);
      if (img !== selected) select(img);
      else placeHandles();
    }
    if (message.cmd === "attr") {
      if (message.value) el.setAttribute(message.name, message.value);
      else el.removeAttribute(message.name);
      emitHtml();
      describe(el);
    }
    if (message.cmd === "text") {
      el.textContent = message.value;
      emitHtml();
      describe(el);
    }
    if (message.cmd === "class") {
      el.className = message.value;
      if (selected === el) el.classList.add("wd-selected");
      emitHtml();
      describe(el);
    }
    if (message.cmd === "toggle-class") {
      el.classList.toggle(message.name);
      if (selected === el) el.classList.add("wd-selected");
      emitHtml();
      describe(el);
    }
    if (message.cmd === "clear-fx") {
      ["rounded", "shadow", "bordered", "pad", "center", "grow", "lift"].forEach(function (name) {
        el.classList.remove(name);
      });
      if (selected === el) el.classList.add("wd-selected");
      emitHtml();
      describe(el);
    }
    if (message.cmd === "format") {
      var sel = window.getSelection();
      var inside = sel && !sel.isCollapsed && el.contains(sel.anchorNode);
      if (inside && (message.name === "bold" || message.name === "italic" || message.name === "underline" || message.name === "strikeThrough")) {
        document.execCommand(message.name);
      } else if (message.name === "bold") el.style.fontWeight = el.style.fontWeight === "700" ? "" : "700";
      else if (message.name === "italic") el.style.fontStyle = el.style.fontStyle === "italic" ? "" : "italic";
      else if (message.name === "underline") el.style.textDecoration = /underline/.test(el.style.textDecoration) ? "" : "underline";
      else if (message.name === "strikeThrough") el.style.textDecoration = /line-through/.test(el.style.textDecoration) ? "" : "line-through";
      else if (message.name === "justifyLeft") el.style.textAlign = "left";
      else if (message.name === "justifyCenter") el.style.textAlign = "center";
      else if (message.name === "justifyRight") el.style.textAlign = "right";
      else if (message.name === "justifyFull") el.style.textAlign = "justify";
      emitHtml();
      describe(el);
    }
    if (message.cmd === "insert") insertHtml(message.html, message.path, message.tag || el.tagName.toLowerCase());
    if (message.cmd === "duplicate") {
      var copy = el.cloneNode(true);
      copy.classList.remove("wd-selected");
      el.after(copy);
      emitHtml();
      select(copy);
    }
    if (message.cmd === "delete") {
      var parent = el.parentElement;
      el.remove();
      emitHtml();
      select(parent && parent !== document.body ? parent : null);
    }
    if (message.cmd === "parent") {
      if (el.parentElement && el.parentElement !== document.body) select(el.parentElement);
    }
    if (message.cmd === "wrap-link") {
      var anchor = document.createElement("a");
      anchor.href = message.href || "https://";
      el.replaceWith(anchor);
      anchor.appendChild(el);
      emitHtml();
      select(anchor);
    }
    if (message.cmd === "list-add") {
      var list = el.tagName === "LI" ? el.parentElement : el.closest("ul,ol");
      if (!list) return;
      var item = document.createElement("li");
      item.textContent = document.documentElement.lang === "ar" ? "بند جديد" : "New item";
      if (el.tagName === "LI") el.after(item);
      else list.appendChild(item);
      emitHtml();
      select(item);
    }
    if (message.cmd === "list-remove") {
      var item = el.tagName === "LI" ? el : el.closest("li");
      if (!item || !item.parentElement || item.parentElement.children.length < 2) return;
      var list = item.parentElement;
      item.remove();
      emitHtml();
      select(list);
    }
    if (message.cmd === "list-kind") {
      var list = el.closest("ul,ol");
      if (!list || list.tagName.toLowerCase() === message.tag) return;
      var next = document.createElement(message.tag);
      next.className = list.className;
      while (list.firstChild) next.appendChild(list.firstChild);
      list.replaceWith(next);
      emitHtml();
      select(next);
    }
    if (message.cmd === "table-scope") {
      var cell = focusCell(el);
      var table = cell && cell.closest("table");
      if (!cell || !table) return;
      var model = gridOf(table);
      var spot = model.place.get(cell);
      if (!spot) return;
      if (message.scope === "all") selectTable(table);
      else if (message.scope === "row") selectRow(table, spot.r);
      else if (message.scope === "col") selectColumn(table, spot.c);
      else select(cell);
      return;
    }
    if (message.cmd === "table-box") {
      var sized = el.closest("table");
      if (!sized) return;
      if (message.width) setTableWidth(sized, message.width);
      if (message.height) setTableHeight(sized, message.height);
      if (message.align) setTableAlign(sized, message.align);
      if (message.margin) setTableMargin(sized, message.margin, message.marginValue);
      emitHtml();
      if (selected) describe(selected);
      placeTableChrome();
      return;
    }
    if (message.cmd === "table-detail") {
      var cell = focusCell(el);
      var table = cell && cell.closest("table");
      if (!cell || !table) return;
      var model = gridOf(table);
      var spot = model.place.get(cell);
      var every = wholeMarked(model);
      var kind = message.kind;
      if (kind === "rows") fitRows(table, message.value);
      else if (kind === "cols") fitCols(table, message.value);
      else if (kind === "border") setTableBorder(table, message.size, message.color);
      else if (kind === "pad") setCellPad(table, message.value);
      else if (kind === "spacing") setSpacing(table, message.value);
      else if (kind === "background") table.style.backgroundColor = message.value || "";
      else if (kind === "cell-color") paintList(cell).forEach(function (item) { item.style.backgroundColor = message.value || ""; });
      else if (kind === "cell-align") alignCells(paintList(cell), "textAlign", message.value || "");
      else if (kind === "cell-valign") alignCells(paintList(cell), "verticalAlign", message.value || "");
      else if (kind === "row-height") setRowsHeight(table, message.value, every, tableScope === "row" && scopeIndex >= 0 ? scopeIndex : (spot ? spot.r : 0));
      else if (kind === "col-width") setColumnWidth(table, tableScope === "col" && scopeIndex >= 0 ? scopeIndex : (spot ? spot.c : 0), message.value, every);
      else return;
      emitHtml();
      if (selected && selected.isConnected) describe(selected);
      else describe(table);
      placeTableChrome();
      return;
    }
    if (message.cmd === "table-paint") {
      var targets = marks.length ? marks.slice() : [];
      if (!targets.length) {
        var only = focusCell(el);
        if (only) targets = [only];
      }
      targets.forEach(function (cell) {
        if (message.value) cell.style.backgroundColor = message.value;
        else cell.style.backgroundColor = "";
      });
      emitHtml();
      if (selected) describe(selected);
      placeTableChrome();
      return;
    }
    if (message.cmd === "row-below" || message.cmd === "row-above") {
      var row = rowOf(focusCell(el) || el);
      var table = el.closest("table");
      if (!row || !table) return;
      var at = tableScope === "row" && scopeIndex >= 0 ? scopeIndex : Array.prototype.indexOf.call(table.rows, row);
      if (message.cmd === "row-below") at += 1;
      var made = insertRowAt(table, at);
      emitHtml();
      select(made.cells[0] || made);
    }
    if (message.cmd === "col-after" || message.cmd === "col-before" || message.cmd === "col-left" || message.cmd === "col-right") {
      var cell = focusCell(el);
      var table = cell && cell.closest("table");
      if (!cell || !table) return;
      var model = gridOf(table);
      var spot = model.place.get(cell);
      if (!spot) return;
      var side = message.cmd === "col-before" || message.cmd === "col-left" ? "left" : "right";
      var at = visualColumn(spot, side);
      var rowAt = tableScope === "row" && scopeIndex >= 0 ? scopeIndex : spot.r;
      insertColumn(table, at);
      var fresh = gridOf(table);
      var next = (fresh.grid[rowAt] && fresh.grid[rowAt][at]) || null;
      emitHtml();
      select(next || table);
    }
    if (message.cmd === "del-row") {
      var row = rowOf(focusCell(el) || el);
      var table = el.closest("table");
      if (!row || !table) return;
      var at = tableScope === "row" && scopeIndex >= 0 ? scopeIndex : Array.prototype.indexOf.call(table.rows, row);
      if (!deleteRow(table, at)) return;
      emitHtml();
      select(table);
    }
    if (message.cmd === "del-col") {
      var cell = focusCell(el);
      var table = cell && cell.closest("table");
      if (!cell || !table) return;
      var model = gridOf(table);
      var spot = model.place.get(cell);
      if (!spot) return;
      var at = tableScope === "col" && scopeIndex >= 0 ? scopeIndex : spot.c;
      if (!deleteColumn(table, at)) return;
      emitHtml();
      select(table);
    }
    if (message.cmd === "del-table") {
      var whole = el.closest("table");
      if (!whole) return;
      var holder = whole.parentElement;
      whole.remove();
      emitHtml();
      select(holder && holder !== document.body ? holder : null);
    }
    if (message.cmd === "merge") {
      var cell = focusCell(el);
      var table = cell && cell.closest("table");
      if (!cell || !table) return;
      var keeper = null;
      if (marks.length > 1) {
        var bounds = markBounds(table);
        keeper = mergeRect(table, bounds.r1, bounds.c1, bounds.r2, bounds.c2);
      } else keeper = mergeToward(cell, false);
      if (!keeper) return;
      emitHtml();
      select(keeper);
    }
    if (message.cmd === "merge-down") {
      var cell = focusCell(el);
      var keeper = cell && mergeToward(cell, true);
      if (!keeper) return;
      emitHtml();
      select(keeper);
    }
    if (message.cmd === "merge-selection") {
      var cell = focusCell(el);
      var table = cell && cell.closest("table");
      if (!cell || !table || marks.length < 2) return;
      var bounds = markBounds(table);
      var keeper = mergeRect(table, bounds.r1, bounds.c1, bounds.r2, bounds.c2);
      if (!keeper) return;
      emitHtml();
      select(keeper);
    }
    if (message.cmd === "split") {
      var cell = focusCell(el);
      var table = cell && cell.closest("table");
      if (!cell || !table) return;
      var pending = marks.length ? marks.slice() : [cell];
      if (pending.indexOf(cell) === -1) pending.push(cell);
      var guard = 0;
      var did = false;
      while (guard < 60) {
        guard += 1;
        var model = gridOf(table);
        var target = null;
        pending.forEach(function (item) {
          if (target || !item.isConnected) return;
          var spot = model.place.get(item);
          if (spot && (spot.cs > 1 || spot.rs > 1)) target = item;
        });
        if (!target) break;
        unmerge(target);
        did = true;
      }
      if (!did) return;
      emitHtml();
      select(cell.isConnected ? cell : table);
    }
    if (message.cmd === "align-col") {
      var cell = focusCell(el);
      var table = cell && cell.closest("table");
      if (!cell || !table) return;
      var model = gridOf(table);
      var spot = model.place.get(cell);
      if (!spot) return;
      var seen = [];
      for (var r = 0; r < model.rows.length; r++) {
        var target = model.grid[r] && model.grid[r][spot.c];
        if (!target || seen.indexOf(target) !== -1) continue;
        seen.push(target);
        target.style.textAlign = message.value;
      }
      emitHtml();
      describe(el);
    }
  });

  window.addEventListener("scroll", placeHandles, true);
  window.addEventListener("resize", placeHandles);
  if (window.ResizeObserver) new ResizeObserver(function () { placeTableChrome(); }).observe(document.documentElement);
  emit("ready");
})();
`;

const EDITOR_CSS = `
html, body { min-height: 100%; }
body { min-height: 100vh; }
.wd-selected { outline: 2px solid #0f766e !important; outline-offset: 2px; }
.wd-table-on { box-shadow: inset 0 0 0 999px rgba(15, 118, 110, .22); outline: 2px solid #0f766e; outline-offset: -2px; }
.wd-hover { outline: 2px dashed #c47b2b !important; outline-offset: 3px; }
body.wd-xray * { outline: 1px dashed rgba(15, 118, 110, .4); }
body.wd-col-resize, body.wd-col-resize * { cursor: col-resize !important; }
body.wd-row-resize, body.wd-row-resize * { cursor: row-resize !important; }
body.wd-col-resize, body.wd-row-resize { user-select: none; }
body.wd-choosing, body.wd-choosing * { user-select: none !important; cursor: cell; }
[contenteditable="true"] { outline: 2px dashed #b86e00 !important; }
img { max-width: 100%; }
`;

export function buildSrcDoc(html: string, css: string, lang: string) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Changa:wght@500;700&family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Inter:wght@400;600;700&family=Lato:wght@400;700&family=Merriweather:wght@700&family=Montserrat:wght@700&family=Open+Sans:wght@400;700&family=Poppins:wght@400;600;700&family=Tajawal:wght@400;700&display=swap">
<style id="wd-editor">${EDITOR_CSS}</style>
<style id="wd-user">${css}</style>
</head>
<body>
${html}
<script>${BRIDGE}<\/script>
</body>
</html>`;
}
