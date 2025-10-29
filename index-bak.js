import { JSDOM } from "jsdom";
import * as csstree from "css-tree";

function filterFontFaces(ast) {
    const usedFontFamilies = new Set();

    // Helper to parse and normalize font families from a string
    function parseFontFamilies(familyString) {
        return familyString
            .split(',')
            .map(f => f.replace(/['"]/g, "").trim().toLowerCase())
            .filter(f => f.length > 0);
    }

    // Collect used font families from rules
    csstree.walk(ast, {
        visit: 'Rule',
        enter(ruleNode) {
            if (ruleNode.block && ruleNode.block.children) {
                ruleNode.block.children.forEach(decl => {
                    if (decl.type === 'Declaration') {
                        // Handle font-family property
                        if (decl.property === 'font-family') {
                            const familyValue = csstree.generate(decl.value);
                            const families = parseFontFamilies(familyValue);
                            families.forEach(family => usedFontFamilies.add(family));
                        }

                        // Handle shorthand font property
                        if (decl.property === 'font') {
                            const fontValue = csstree.generate(decl.value);
                            // Extract font-family from shorthand (it's always last)
                            const parts = fontValue.split(/\s+/);
                            // Font family can be multiple words, typically after size
                            const sizeIndex = parts.findIndex(p => /\d+(px|em|rem|pt|%)/i.test(p));
                            if (sizeIndex >= 0 && sizeIndex < parts.length - 1) {
                                const familyPart = parts.slice(sizeIndex + 1).join(' ');
                                const families = parseFontFamilies(familyPart);
                                families.forEach(family => usedFontFamilies.add(family));
                            }
                        }
                    }
                });
            }
        }
    });

    // Filter font-face rules - keep ALL variants of used font families
    csstree.walk(ast, {
        visit: 'Atrule',
        enter(node, item, list) {
            if (node.name === 'font-face') {
                let family = null;

                node.block.children.forEach(decl => {
                    if (decl.type === 'Declaration') {
                        if (decl.property === 'font-family') {
                            family = csstree.generate(decl.value).replace(/['"]/g, "").trim().toLowerCase();
                        }
                    }
                });

                // Keep this @font-face if its family is used anywhere in the CSS
                if (!family || !usedFontFamilies.has(family)) {
                    list.remove(item);
                }
            }
        }
    });

    return ast;
}

function removeUnusedKeyframes(ast) {
    const usedAnimations = new Set();

    // Collect used animation names
    csstree.walk(ast, {
        visit: 'Declaration',
        enter(node) {
            if (node.property === 'animation' || node.property === 'animation-name') {
                const value = csstree.generate(node.value);

                // Split by commas (multiple animations)
                value.split(',').forEach(animPart => {
                    const name = animPart.trim().split(/\s+/)[0];
                    if (
                        name &&
                        !['none', 'unset', 'inherit', 'initial'].includes(name)
                    ) {
                        usedAnimations.add(name);
                    }
                });
            }
        },
    });

    // Remove unused @keyframes rules
    csstree.walk(ast, {
        visit: 'Atrule',
        enter(node, item, list) {
            if (
                node.name === 'keyframes' ||
                node.name === '-webkit-keyframes' ||
                node.name === '-moz-keyframes'
            ) {
                const name = csstree.generate(node.prelude);
                if (!usedAnimations.has(name)) {
                    list.remove(item);
                }
            }
        },
    });

    return ast;
}

export function blitzcss({ pageurl, html, css, forceInclude }) {

    const dom = new JSDOM(html, { 
        url: pageurl,
    });
    const { document } = dom.window;
    let ast = csstree.parse(css, { parseValue: true, parseCustomProperty: false });
    const usedAnimations = new Set();

    let insideKeyframes = false;

    csstree.walk(ast, {
        enter(node, item, list) {
            // Detect entering @keyframes
            if (node.type === 'Atrule' && node.name === 'keyframes') {
                insideKeyframes = true;
            }

            // Skip processing rules inside keyframes
            if (insideKeyframes && node.type === 'Rule') {
                return;
            }

            if (node.type === 'Rule') {
                let selector = csstree.generate(node.prelude).trim();
                let keep = false;

                try {
                    const reg_match = forceInclude?.some(regex => regex.test(selector));

                    // Clean pseudo-elements/pseudo-classes
                    selector = selector.replace(/:(before|after|hover)/g, '');

                    if (reg_match || document.querySelector(selector)) keep = true;
                } catch {
                    keep = true;
                }

                if (!keep) list.remove(item);
            }
        },

        leave(node) {
            // Detect exiting @keyframes
            if (node.type === 'Atrule' && node.name === 'keyframes') {
                insideKeyframes = false;
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
    ast = removeUnusedKeyframes(ast);

    return csstree.generate(ast);

}
