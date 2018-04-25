/*eslint-env es6, browser*/

window.itemData = [];
let sourceFrag;
let thumbFrag;
let imgFrag;

function createElementTemplate() {
    let frag = new DocumentFragment();

    frag.appendChild(document.createElement('div'));
    frag.appendChild(document.createElement('div'));
    frag.firstElementChild.className = "image-ui-container";
    frag.lastElementChild.className = "sixteenbynine";
    let item = frag.lastElementChild;
    item.appendChild(document.createElement('img'));
    item.firstElementChild.className = "gallery-image";
    item = frag.firstElementChild;
    item.appendChild(document.createElement('div'));
    item.appendChild(document.createElement('div'));
    item.firstElementChild.className = "image-bar";
    item.lastElementChild.className = "image-frame";
    item = item.firstElementChild;
    item.appendChild(document.createElement('span'));
    item.appendChild(document.createElement('span'));
    item.firstElementChild.className = "image-menubutton";
    item.lastElementChild.className = "image-title";
    item = item.firstElementChild;
    item.appendChild(document.createElement('div'));
    item.appendChild(document.createElement('div'));
    item.appendChild(document.createElement('div'));

    return frag;
}

function createImgTemplate() {
    let frag = new DocumentFragment();

    frag.appendChild(document.createElement('img'));
    frag.firstElementChild.className = "gallery-image";

    return frag;
}

function storeData(data) {
    for (let folder of data) {
        let gridItem = sourceFrag.cloneNode(true);
        gridItem.firstElementChild.firstElementChild.lastElementChild.textContent = folder.name;
        let dom = folder.images[0].dominantColor;
        let multiplier = 96/(dom.r+dom.g+dom.b);
        folder.images[0].dominantColorDark = {
            r: dom.r * multiplier,
            g: dom.g * multiplier,
            b: dom.b * multiplier
        }

        if (folder.images.length != 1) {
            folder.thumbnailIndex = 0;
            gridItem.lastElementChild.appendChild(imgFrag.cloneNode(true));
        }

        folder.gridItem = document.createElement('div');
        folder.gridItem.className = "grid-item";
        folder.gridItem.appendChild(gridItem);
        folder.gridItem.data = folder;
        window.itemData.push(folder);
    }
}

function startPreload() {
    window.preload = new Promise(function(resolve) {
        let request = new XMLHttpRequest();
        request.onload = (function(data) {
            let json = JSON.parse(data.target.response);
            sourceFrag = createElementTemplate();
            imgFrag = createImgTemplate();
            storeData(json.folders);
            resolve("loaded");
        });
        request.open("get", "metadata.json", true);
        request.send();
    })
}
startPreload();
