/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/localStorage";
exports.ids = ["vendor-chunks/localStorage"];
exports.modules = {

/***/ "(ssr)/./node_modules/localStorage/lib/localStorage.js":
/*!*******************************************************!*\
  !*** ./node_modules/localStorage/lib/localStorage.js ***!
  \*******************************************************/
/***/ ((module) => {

eval("// http://www.rajdeepd.com/articles/chrome/localstrg/LocalStorageSample.htm\n\n// NOTE:\n// this varies from actual localStorage in some subtle ways\n\n// also, there is no persistence\n// TODO persist\n(function () {\n  \"use strict\";\n\n  var db;\n\n  function LocalStorage() {\n  }\n  db = LocalStorage;\n\n  db.prototype.getItem = function (key) {\n    if (this.hasOwnProperty(key)) {\n      return String(this[key]);\n    }\n    return null;\n  };\n\n  db.prototype.setItem = function (key, val) {\n    this[key] = String(val);\n  };\n\n  db.prototype.removeItem = function (key) {\n    delete this[key];\n  };\n\n  db.prototype.clear = function () {\n    var self = this;\n    Object.keys(self).forEach(function (key) {\n      self[key] = undefined;\n      delete self[key];\n    });\n  };\n\n  db.prototype.key = function (i) {\n    i = i || 0;\n    return Object.keys(this)[i];\n  };\n\n  db.prototype.__defineGetter__('length', function () {\n    return Object.keys(this).length;\n  });\n\n  if (global.localStorage) {\n    module.exports = localStorage;\n  } else {\n    module.exports = new LocalStorage();\n  }\n}());\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvbG9jYWxTdG9yYWdlL2xpYi9sb2NhbFN0b3JhZ2UuanMiLCJtYXBwaW5ncyI6IkFBQUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQSxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vc3RhY2stYWNhZGVteS8uL25vZGVfbW9kdWxlcy9sb2NhbFN0b3JhZ2UvbGliL2xvY2FsU3RvcmFnZS5qcz84MDUyIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGh0dHA6Ly93d3cucmFqZGVlcGQuY29tL2FydGljbGVzL2Nocm9tZS9sb2NhbHN0cmcvTG9jYWxTdG9yYWdlU2FtcGxlLmh0bVxuXG4vLyBOT1RFOlxuLy8gdGhpcyB2YXJpZXMgZnJvbSBhY3R1YWwgbG9jYWxTdG9yYWdlIGluIHNvbWUgc3VidGxlIHdheXNcblxuLy8gYWxzbywgdGhlcmUgaXMgbm8gcGVyc2lzdGVuY2Vcbi8vIFRPRE8gcGVyc2lzdFxuKGZ1bmN0aW9uICgpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIGRiO1xuXG4gIGZ1bmN0aW9uIExvY2FsU3RvcmFnZSgpIHtcbiAgfVxuICBkYiA9IExvY2FsU3RvcmFnZTtcblxuICBkYi5wcm90b3R5cGUuZ2V0SXRlbSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICByZXR1cm4gU3RyaW5nKHRoaXNba2V5XSk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG4gIGRiLnByb3RvdHlwZS5zZXRJdGVtID0gZnVuY3Rpb24gKGtleSwgdmFsKSB7XG4gICAgdGhpc1trZXldID0gU3RyaW5nKHZhbCk7XG4gIH07XG5cbiAgZGIucHJvdG90eXBlLnJlbW92ZUl0ZW0gPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgZGVsZXRlIHRoaXNba2V5XTtcbiAgfTtcblxuICBkYi5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE9iamVjdC5rZXlzKHNlbGYpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgc2VsZltrZXldID0gdW5kZWZpbmVkO1xuICAgICAgZGVsZXRlIHNlbGZba2V5XTtcbiAgICB9KTtcbiAgfTtcblxuICBkYi5wcm90b3R5cGUua2V5ID0gZnVuY3Rpb24gKGkpIHtcbiAgICBpID0gaSB8fCAwO1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzKVtpXTtcbiAgfTtcblxuICBkYi5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXygnbGVuZ3RoJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzKS5sZW5ndGg7XG4gIH0pO1xuXG4gIGlmIChnbG9iYWwubG9jYWxTdG9yYWdlKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBsb2NhbFN0b3JhZ2U7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBuZXcgTG9jYWxTdG9yYWdlKCk7XG4gIH1cbn0oKSk7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/localStorage/lib/localStorage.js\n");

/***/ })

};
;