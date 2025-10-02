import { JSDOM } from "jsdom";
import * as csstree from "css-tree";

function filterFontFaces(ast) {
    const usedFonts = new Set();

    // Collect used fonts from rules
    csstree.walk(ast, {
        visit: 'Rule',
        enter(ruleNode) {
            if (ruleNode.block && ruleNode.block.children) {
                let family = null;
                let weight = '400';
                let style = 'normal';

                ruleNode.block.children.forEach(decl => {
                    if (decl.type === 'Declaration') {
                        if (decl.property === 'font-family') {
                            family = csstree.generate(decl.value).replace(/['"]/g, "").trim();
                        }
                        if (decl.property === 'font-weight') {
                            weight = csstree.generate(decl.value).trim();
                        }
                        if (decl.property === 'font-style') {
                            style = csstree.generate(decl.value).trim();
                        }
                    }
                });

                if (family) {
                    usedFonts.add({ family, weight, style });
                }
            }
        }
    });

    // Filter font-face rules
    csstree.walk(ast, {
        visit: 'Atrule',
        enter(node, item, list) {
            if (node.name === 'font-face') {
                let family, weight = '400', style = 'normal';

                node.block.children.forEach(decl => {
                    if (decl.type === 'Declaration') {
                        if (decl.property === 'font-family') {
                            family = csstree.generate(decl.value).replace(/['"]/g, "").trim();
                        }
                        if (decl.property === 'font-weight') {
                            weight = csstree.generate(decl.value).trim();
                        }
                        if (decl.property === 'font-style') {
                            style = csstree.generate(decl.value).trim();
                        }
                    }
                });

                let keep = false

                usedFonts.forEach(item => {
                    if (item.family.includes(family) && item.weight === weight && item.style === style) {
                        keep = true;
                    }
                })

                if (!keep) {
                    list.remove(item);
                }

            }
        }
    });

    return ast;
}

export function blitzcss({ pageurl, html, css }) {

    const dom = new JSDOM(html, { url: pageurl });
    const { document } = dom.window;
    let ast = csstree.parse(css, { parseValue: true, parseCustomProperty: false });
    const usedAnimations = new Set();

    csstree.walk(ast, {
        visit: "Rule",
        enter(node, item, list) {
            if (node.type === "Rule") {
                let selector = csstree.generate(node.prelude).trim();
                let keep = false;
                try {
                    if (selector.includes(':before') || selector.includes(':after') || selector.includes(':hover')) {
                        selector = selector.replace(':before', '');
                        selector = selector.replace(':after', '');
                        selector = selector.replace(':hover', '');
                    }
                    if (document.querySelector(selector)) keep = true;

                } catch {
                    keep = true;
                }

                if (!keep) {
                    list.remove(item);
                } else {
                    // collect font-family and animation names
                    node.block.children.forEach((decl) => {
                        if (decl.type === "Declaration") {
                            if (decl.property === "animation" || decl.property === "animation-name") {
                                usedAnimations.add(csstree.generate(decl.value).split(" ")[0]);
                            }
                        }
                    });
                }
            }
        },
    });

    csstree.walk(ast, {
        visit: "Atrule",
        enter(node, item, list) {
            if (node.name === "keyframes") {
                const animName = node.prelude && csstree.generate(node.prelude).trim();
                if (!usedAnimations.has(animName)) {
                    list.remove(item);
                }
            }
        },
    });

    // Remove empty @media blocks
    csstree.walk(ast, {
        visit: "Atrule",
        enter(node, item, list) {
            if (node.name === "media" && node.block) {
                let count = 0;
                if (node.block && node.block.children) {
                    node.block.children.forEach(() => count++);
                }

                if (count === 0) {
                    list.remove(item);
                }

            }
        },
    });

    // Extract used font faces
    ast = filterFontFaces(ast);

    return csstree.generate(ast);

}