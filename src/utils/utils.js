const utils = {
    isArray: Array.isArray || ((arg) => {
        return Object.prototype.toString.call(arg) === '[object Array]';
    }),

    funcOrValue: (funcOrValue, _this) => {
        if (typeof funcOrValue === 'function') {
            let res = funcOrValue.call(_this);
            return res;
        }

        return funcOrValue;
    },

    // 执行钩子函数或者钩子函数队列
    execFuncs: (funcOrArray, _this, _arg) => {
        if (funcOrArray) {
            if (!utils.isArray(_arg)) {
                _arg = [_arg];
            }
        }

        if (typeof funcOrArray === 'function') {
            funcOrArray.apply(_this, _arg);
        } else if (utils.isArray(funcOrArray)) {
            funcOrArray.forEach((f) => {
                f && f.apply(_this, _arg);
            });
        }
    },

    blend: ['source-over', 'source-in', 'source-out', 'source-atop', 'destination-over', 'destination-in', 'destination-out', 'destination-atop', 'lighter', 'copy', 'xor', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'],

    pointInRect: (x, y, x1, x2, y1, y2) => {
        return !(x < x1 || x > x2 || y < y1 || y > y2);
    },

    firstValuable: (a, b) => {
        return typeof a === 'undefined' ? b : a;
    },
};

module.exports = utils;
