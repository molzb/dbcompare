/* jshint esversion: 6 */
function $(id) {
    return document.querySelector(id);
}

function $all(id) {
    return Array.from(document.querySelectorAll(id));
}

HTMLElement.prototype.show = function() { this.style.display = 'inline-block'; }
HTMLElement.prototype.hide = function() { this.style.display = 'none'; }
HTMLElement.prototype.empty = function() { this.innerHTML = ''; }
HTMLElement.prototype.addClass = function(cls) { this.classList.add(cls); };
HTMLElement.prototype.removeClass = function(cls) { this.classList.remove(cls); };
//