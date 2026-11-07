export type Guide = {
  line: number;
  en: string;
  ar: string;
  markFrom: number;
  markTo: number;
  from: number;
  to: number;
  repair: string;
  fixEn: string;
  fixAr: string;
};

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const NO_NEST = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "a", "li", "button"]);

const TAG_NAMES: Record<string, { use: string; en: string; ar: string }> = {
  paragraph: { use: "p", en: "A paragraph is written <p> … </p>.", ar: "الفقرة تُكتب <p> … </p>." },
  para: { use: "p", en: "A paragraph is written <p> … </p>.", ar: "الفقرة تُكتب <p> … </p>." },
  heading: { use: "h1", en: "A heading is written <h1> … </h1>.", ar: "العنوان يُكتب <h1> … </h1>." },
  image: { use: "img", en: "A picture is written <img>. It does not need a closing tag.", ar: "الصورة تُكتب <img>. لا تحتاج وسم إغلاق." },
  picture: { use: "img", en: "A picture is written <img>. It does not need a closing tag.", ar: "الصورة تُكتب <img>. لا تحتاج وسم إغلاق." },
  bold: { use: "b", en: "Bold text is written <b> … </b>.", ar: "الخط العريض يُكتب <b> … </b>." },
  italic: { use: "i", en: "Italic text is written <i> … </i>.", ar: "الخط المائل يُكتب <i> … </i>." },
  list: { use: "ul", en: "A list starts with <ul>, and each item is <li> … </li>.", ar: "القائمة تبدأ بـ <ul>، وكل عنصر <li> … </li>." },
};

const CSS_NAMES: Record<string, string> = {
  colour: "color",
  "font-szie": "font-size",
  fontsize: "font-size",
  backgroud: "background",
  "background-colour": "background-color",
};

function lineOf(text: string, index: number) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === "\n") line += 1;
  return line;
}

function note(text: string, index: number, end: number, fields: Omit<Guide, "line" | "markFrom" | "markTo"> & { markFrom?: number; markTo?: number }): Guide {
  return {
    line: lineOf(text, fields.markFrom ?? index),
    markFrom: fields.markFrom ?? index,
    markTo: fields.markTo ?? end,
    ...fields,
  };
}

export function guideHtml(text: string): Guide | null {
  if (!text.trim()) return null;
  const stack: { name: string; index: number; end: number }[] = [];
  let i = 0;
  while (i < text.length) {
    const lt = text.indexOf("<", i);
    if (lt < 0) break;
    if (text.startsWith("<!--", lt)) {
      const end = text.indexOf("-->", lt + 4);
      if (end < 0) {
        return note(text, lt, text.length, {
          en: "This comment is not finished. End it with -->.",
          ar: "هذا التعليق لم يكتمل. أنهه بـ -->.",
          from: text.length,
          to: text.length,
          repair: " -->",
          fixEn: "Add -->",
          fixAr: "أضف -->",
        });
      }
      i = end + 3;
      continue;
    }
    const nextLt = text.indexOf("<", lt + 1);
    let gt = text.indexOf(">", lt + 1);
    if (gt < 0 || (nextLt >= 0 && nextLt < gt)) {
      const chunk = text.slice(lt + 1, nextLt < 0 ? text.length : nextLt);
      const named = chunk.match(/[a-zA-Z][a-zA-Z0-9]*/)?.[0].toLowerCase();
      const insertAt = nextLt < 0 ? text.length : nextLt;
      if (!named) {
        return note(text, lt, insertAt, {
          en: "You started a tag with < and have not finished it. A heading is <h1> and a paragraph is <p>.",
          ar: "بدأت وسمًا بـ < ولم تكمله. العنوان <h1> والفقرة <p>.",
          from: insertAt,
          to: insertAt,
          repair: "p>",
          fixEn: "Write <p>",
          fixAr: "اكتب <p>",
        });
      }
      const slash = /^\s*\//.test(chunk);
      const sample = slash ? `</${named}>` : `<${named}>`;
      return note(text, lt, insertAt, {
        en: `This tag is not finished. Add > so it reads ${sample}.`,
        ar: `هذا الوسم لم يكتمل. أضف > ليصبح ${sample}.`,
        from: insertAt,
        to: insertAt,
        repair: ">",
        fixEn: "Add >",
        fixAr: "أضف >",
      });
    }
    const body = text.slice(lt + 1, gt).trim();
    const tagEnd = gt + 1;
    if (!body || body.startsWith("!") || body.startsWith("?")) {
      i = tagEnd;
      continue;
    }
    const closing = body.startsWith("/");
    const token = (closing ? body.slice(1) : body).replace(/\/$/, "").trim().split(/\s+/)[0] || "";
    const name = token.toLowerCase();
    if (!/^[a-z][a-z0-9]*$/.test(name)) {
      return note(text, lt, tagEnd, {
        en: "This is not a tag name. A tag looks like <h1> or <p>.",
        ar: "هذا ليس اسم وسم. الوسم يُكتب مثل <h1> أو <p>.",
        from: lt,
        to: tagEnd,
        repair: "<p>",
        fixEn: "Write <p>",
        fixAr: "اكتب <p>",
      });
    }
    const known = TAG_NAMES[name];
    if (known && !closing) {
      const nameAt = text.toLowerCase().indexOf(name, lt);
      return note(text, lt, tagEnd, {
        en: known.en,
        ar: known.ar,
        markFrom: nameAt,
        markTo: nameAt + name.length,
        from: nameAt,
        to: nameAt + name.length,
        repair: known.use,
        fixEn: `Change it to <${known.use}>`,
        fixAr: `اجعله <${known.use}>`,
      });
    }
    if (/^h[7-9]$/.test(name)) {
      return note(text, lt, tagEnd, {
        en: "Headings are <h1>, <h2>, or <h3>.",
        ar: "العناوين هي <h1> أو <h2> أو <h3>.",
        from: lt + (closing ? 2 : 1),
        to: lt + (closing ? 2 : 1) + name.length,
        repair: "h1",
        fixEn: "Change it to h1",
        fixAr: "اجعله h1",
      });
    }
    if (closing && VOID.has(name)) {
      return note(text, lt, tagEnd, {
        en: `<${name}> stands on its own. It does not need </${name}>.`,
        ar: `<${name}> يقف وحده. لا يحتاج </${name}>.`,
        from: lt,
        to: tagEnd,
        repair: "",
        fixEn: "Remove the closing tag",
        fixAr: "احذف وسم الإغلاق",
      });
    }
    if (closing) {
      const open = stack.pop();
      if (!open) {
        return note(text, lt, tagEnd, {
          en: `</${name}> closes a tag, but you have not opened <${name}>.`,
          ar: `</${name}> وسم إغلاق، لكنك لم تفتح <${name}>.`,
          from: lt,
          to: tagEnd,
          repair: "",
          fixEn: "Remove it",
          fixAr: "احذفه",
        });
      }
      if (open.name !== name) {
        return note(text, lt, tagEnd, {
          en: `You opened <${open.name}> on line ${lineOf(text, open.index)}, then closed it with </${name}>. Finish <${open.name}> with </${open.name}>.`,
          ar: `فتحت <${open.name}> في السطر ${lineOf(text, open.index)}، ثم أغلقته بـ </${name}>. أغلق <${open.name}> بـ </${open.name}>.`,
          markFrom: open.index,
          markTo: open.end,
          from: lt,
          to: tagEnd,
          repair: `</${open.name}>`,
          fixEn: `Change it to </${open.name}>`,
          fixAr: `اجعله </${open.name}>`,
        });
      }
    } else if (!body.endsWith("/")) {
      const open = stack[stack.length - 1];
      if (open && open.name === name && NO_NEST.has(name) && !body.includes(" ")) {
        return note(text, lt, tagEnd, {
          en: `The slash is missing. To finish <${name}>, write </${name}>.`,
          ar: `الشرطة / ناقصة. لإغلاق <${name}> اكتب </${name}>.`,
          from: lt,
          to: tagEnd,
          repair: `</${name}>`,
          fixEn: `Write </${name}>`,
          fixAr: `اكتب </${name}>`,
        });
      }
      if (!VOID.has(name)) stack.push({ name, index: lt, end: tagEnd });
    }
    i = tagEnd;
  }
  const open = stack[stack.length - 1];
  if (open) {
    return note(text, open.index, open.end, {
      en: `<${open.name}> on line ${lineOf(text, open.index)} is still open. Finish it with </${open.name}>.`,
      ar: `<${open.name}> في السطر ${lineOf(text, open.index)} ما زال مفتوحًا. أغلقه بـ </${open.name}>.`,
      from: text.length,
      to: text.length,
      repair: `${text.endsWith("\n") || text.length === 0 ? "" : ""}</${open.name}>`,
      fixEn: `Add </${open.name}>`,
      fixAr: `أضف </${open.name}>`,
    });
  }
  return null;
}

export function guideCss(text: string): Guide | null {
  if (!text.trim()) return null;
  const quiet = text.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));
  const unfinished = quiet.lastIndexOf("/*");
  if (unfinished >= 0) {
    return note(text, unfinished, text.length, {
      en: "This comment is not finished. End it with */.",
      ar: "هذا التعليق لم يكتمل. أنهه بـ */.",
      from: text.length,
      to: text.length,
      repair: " */",
      fixEn: "Add */",
      fixAr: "أضف */",
    });
  }
  let depth = 0;
  let openAt = -1;
  for (let i = 0; i < quiet.length; i++) {
    const ch = quiet[i];
    if (ch === "{") {
      if (depth === 0) openAt = i;
      depth += 1;
    } else if (ch === "}") {
      if (depth === 0) {
        return note(text, i, i + 1, {
          en: "This } does not close a rule. A rule looks like h1 { color: teal; }.",
          ar: "هذا } لا يغلق قاعدة. القاعدة تُكتب مثل h1 { color: teal; }.",
          from: i,
          to: i + 1,
          repair: "",
          fixEn: "Remove }",
          fixAr: "احذف }",
        });
      }
      depth -= 1;
    }
  }

  const lines = quiet.split("\n");
  let offset = 0;
  let inBlock = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    const start = offset + line.indexOf(trimmed);
    const end = start + trimmed.length;
    if (trimmed && !trimmed.startsWith("}") && !trimmed.endsWith("{")) {
      const bare = trimmed.replace(/;+\s*$/, "");
      if (inBlock && bare && !bare.includes("{") && !bare.includes("}")) {
        if (!bare.includes(":")) {
          const words = bare.split(/\s+/);
          const sample = words.length > 1 ? `${words[0]}: ${words.slice(1).join(" ")};` : `${bare}: teal;`;
          return note(text, start, end, {
            en: `This line needs a colon. Write ${sample}`,
            ar: `هذا السطر يحتاج نقطتين. اكتبه هكذا ${sample}`,
            from: start,
            to: end,
            repair: sample,
            fixEn: "Add the colon",
            fixAr: "أضف النقطتين",
          });
        }
        const key = bare.slice(0, bare.indexOf(":")).trim().toLowerCase();
        const fixed = CSS_NAMES[key];
        if (fixed) {
          const keyAt = line.toLowerCase().indexOf(key);
          return note(text, offset + keyAt, offset + keyAt + key.length, {
            en: key === "colour" || key.endsWith("colour")
              ? `CSS spells this ${fixed}, with no u.`
              : `This is written ${fixed}.`,
            ar: key === "colour" || key.endsWith("colour")
              ? `في CSS تُكتب ${fixed} من غير حرف u.`
              : `تُكتب هكذا ${fixed}.`,
            from: offset + keyAt,
            to: offset + keyAt + key.length,
            repair: fixed,
            fixEn: `Change it to ${fixed}`,
            fixAr: `اجعله ${fixed}`,
          });
        }
        const value = bare.slice(bare.indexOf(":") + 1).trim();
        const next = lines.slice(index + 1).map((item) => item.trim()).find(Boolean) || "";
        if (value && !trimmed.endsWith(";") && (next.startsWith("}") || next.includes(":"))) {
          return note(text, start, end, {
            en: "Add a semicolon at the end of this line.",
            ar: "أضف فاصلة منقوطة ; في نهاية هذا السطر.",
            from: end,
            to: end,
            repair: ";",
            fixEn: "Add ;",
            fixAr: "أضف ;",
          });
        }
      } else if (!inBlock && bare.includes(":") && !bare.includes("{")) {
        const rule = `h1 {\n  ${trimmed.endsWith(";") ? trimmed : `${trimmed};`}\n}`;
        return note(text, start, end, {
          en: "Put this inside a rule. Start with the tag name, then {.",
          ar: "ضع هذا داخل قاعدة. ابدأ باسم الوسم ثم {.",
          from: start,
          to: end,
          repair: rule,
          fixEn: "Put it in a rule",
          fixAr: "ضعه داخل قاعدة",
        });
      }
    }
    if (trimmed.includes("{")) inBlock = true;
    if (trimmed.includes("}")) inBlock = false;
    offset += line.length + 1;
  }

  if (depth > 0 && openAt >= 0) {
    return note(text, openAt, openAt + 1, {
      en: `You opened { on line ${lineOf(text, openAt)} and have not closed it. Add }.`,
      ar: `فتحت { في السطر ${lineOf(text, openAt)} ولم تغلقه. أضف }.`,
      from: text.length,
      to: text.length,
      repair: text.endsWith("\n") ? "}" : "\n}",
      fixEn: "Add }",
      fixAr: "أضف }",
    });
  }

  const selector = text.trim();
  if (!selector.includes("{") && /^(body|h[1-6]|p|a|ul|ol|li|img|div|span)$/i.test(selector)) {
    return note(text, 0, selector.length, {
      en: `Add { after ${selector} to start the rule, then a line such as color: teal;`,
      ar: `أضف { بعد ${selector} لبدء القاعدة، ثم سطرًا مثل color: teal;`,
      from: text.length,
      to: text.length,
      repair: " {\n  \n}",
      fixEn: "Add { }",
      fixAr: "أضف { }",
    });
  }
  return null;
}

export function applyGuide(text: string, guide: Guide) {
  return text.slice(0, guide.from) + guide.repair + text.slice(guide.to);
}
