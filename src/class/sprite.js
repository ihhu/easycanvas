/** ********** *
 *
 * Sprite Structure
 * {
 *     style: {
 *         tx, ty, tw, th,
 *         zIndex, opacity, scale, rotate, rx, ry,
 *         sx, sy, sw, sh, locate, // useless for content.text
 *         fh, fv, fx, fy, // transfrom
 *         align, font, color, // useless for content.img
 *         visible, // visible false equals inexistence
 *         mirrX, mirrY, // visible false equals inexistence
 *     },
 *     content: {
 *         img,
 *         text,
 *         sequence: {} // for animate sprite
 *     },
 *     events: {
 *         eIndex,
 *         click / touchstart / contextmenu / ... / hold / touchout,
 *         through,
 *     },
 *     children: [
 *         { Sprite }, { Sprite } ...
 *     ],
 *     inherit: ['tx', 'ty', ...] // inherit from parent, default is ['tx', 'ty', 'scale']
 *     hooks: {
 *         created, mounted, painted, ticked
 *     },
 *
 *     $parent: { Sprite },
 *     $cache: {
 *         tx, ty, tw, th, ...
 *     },
 *
 * }
 *
 * ********** **/

import utils from 'utils/utils.js';
import constants from 'constants';

import on from '../painter/apiOuter/on.js';
import off from '../painter/apiOuter/off.js';
import trigger from '../painter/apiOuter/trigger.js';
import broadcast from '../painter/apiOuter/broadcast.js';
import bindDrag from '../painter/apiInner/bindDrag.js';

const ChangeChildrenToSprite = function ($parent) {
    if ($parent.children) {
        $parent.children.forEach((child, i) => {
            if (!child.$id) {
                $parent.children[i] = new sprite(child);
            }
            if ($parent.$id && !$parent.$dom) {
                $parent.children[i].$canvas = $parent.$canvas;
                $parent.children[i].$parent = $parent;
            } else {
                $parent.children[i].$canvas = $parent;
            }

            // if (typeof $parent.children[i].content.img === 'string') {
            //     $parent.children[i].content.img = $parent.children[i].$canvas.imgLoader($parent.children[i].content.img);
            // }

            ChangeChildrenToSprite($parent.children[i]);
        });
    }
};

// Set default values to sprite
const preAdd = function (_item) {
    let item = _item || {};

    if (!item.$id) {
        item.$id = Math.random().toString(36).substr(2);
    }

    item.$tickedTimes = item.$tickedTimes || 0;

    item.content = item.content || {};

    item.style = item.style || {};

    item.style.zIndex = item.style.zIndex || 0;
    item.style.mirrX = item.style.mirrX || 0;

    item.style.opacity = utils.firstValuable(item.style.opacity, 1);
    item.style.locate = item.style.locate || 'center';
    // item.style.rotate = item.style.rotate || 0;
    item.style.scale = item.style.scale || 1;

    let _img = utils.funcOrValue(item.content.img);

    constants.xywh.forEach((key) => {
        item.style[key] = item.style[key] || 0;
    });

    item.inherit = item.inherit || ['tx', 'ty', 'scale', 'opacity'];
    item.drag = item.drag || {};

    item.events = item.events || {};
    if (process.env.NODE_ENV !== 'production') {
        for (var i in item.events) {
            if (typeof item.events[i] !== 'function' && i !== 'eIndex') {
                console.warn(`[Easycanvas] Handler ${i} is not a function.`, item.events[i]);
            }
        }
    }

    item.events.eIndex = item.events.eIndex;
    // item.events.through = !!item.events.through;

    item.scroll = item.scroll || {};
    item.scroll.scrollX = item.scroll.scrollX || 0;
    item.scroll.scrollY = item.scroll.scrollY || 0;

    item.hooks = item.hooks || {};

    if (process.env.NODE_ENV !== 'production') {
        item.$perf = {};
    }

    if (process.env.NODE_ENV !== 'production') {
        if (!item.name && item.content.img && item.content.img.src) {
            let fileName = item.content.img.src.match(/.*\/([^\/]*)$/);
            if (fileName && fileName[1]) {
                item.name = fileName[1];
            }
        }
        item.name = item.name || 'Unnamed Easycanvas Object';
    }

    item.children = item.children || [];

    ChangeChildrenToSprite(item);

    item.$cache = {};
    item.$scroll = {
        speedX: 0,
        speedY: 0,
    };

    return item;
};

const extend = function (opt) {
    this.$extendList.forEach((plugin) => {
        plugin.call(this, opt);
    });
};

let sprite = function (opt) {
    let _opt = preAdd(opt);

    for (let i in _opt) {
        if (Object.prototype.hasOwnProperty.call(_opt, i)) {
            this[i] = _opt[i];
        }
    }

    extend.call(this, _opt);

    return this;
};

sprite.prototype.$extendList = [];

sprite.prototype.add = function (child) {
    if (!child) {
        return;
    }

    this.children.push(child);

    ChangeChildrenToSprite(this);

    bindDrag.bind(this.children[this.children.length - 1]);

    return this.children[this.children.length - 1];
};

sprite.prototype.getRect = function () {
    let res = {};
    for (var key in this.style) {
        res[key] = this.$cache[key];
    }
    return res;
};

sprite.prototype.getSelfStyle = function ({locate}) {
    let res = {};
    for (var key in this.style) {
        res[key] = utils.funcOrValue(this.style[key], this);
    }

    return res;
};

sprite.prototype.getStyle = function (key) {
    let $sprite = this;
    let currentValue = utils.funcOrValue($sprite.style[key], $sprite);

    if ($sprite.$parent && $sprite.inherit.indexOf(key) >= 0) {
        // 额外处理滚动
        if (key === 'tx') {
            currentValue -= $sprite.$parent.scroll.scrollX || 0;
        }
        else if (key === 'ty') {
            currentValue -= $sprite.$parent.scroll.scrollY || 0;
        }

        if (key === 'tw' || key === 'th') {
            return utils.firstValuable(currentValue, $sprite.$parent.getStyle(key));
        }
        else if (key === 'opacity' || key === 'scale') {
            return (
                utils.firstValuable($sprite.$parent.getStyle(key), 1)
            ) * utils.firstValuable(currentValue, 1);
        } else {
            return (
                utils.firstValuable($sprite.$parent.getStyle(key), 0)
            ) + utils.firstValuable(currentValue, 0);
        }

    }

    return currentValue;
};

sprite.prototype.remove = function (child) {
    if (child) {
        this.$canvas.remove(child);
        utils.execFuncs(child.hooks.removed, child);
        return;
    }

    if (this.$parent) {
        this.$parent.remove(this);
    } else {
        this.$canvas.remove(this);
    }
    utils.execFuncs(this.hooks.removed, this);
};

sprite.prototype.update = function (opt) {
    if (!opt) return;

    for (var i in opt) {
        if (typeof opt[i] === 'object') {
            for (var j in opt[i]) {
                this[i][j] = opt[i][j];
            }
        } else {
            this[i] = opt[i];
        }
    }
};

sprite.prototype.on = on;
sprite.prototype.off = off;
sprite.prototype.trigger = trigger;
sprite.prototype.broadcast = broadcast;

module.exports = sprite;
