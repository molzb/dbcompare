function $(id) {
    return document.querySelector(id);
}

function $all(id) {
    return document.querySelectorAll(id);
}

HTMLElement.prototype.show = function() {
    this.style.display = 'inline-block';
};

HTMLElement.prototype.hide = function() {
    this.style.display = 'none';
};

HTMLElement.prototype.empty = function() {
    this.innerHTML = '';
};