/*eslint-env es6, browser*/

window.itemData = [];

function returnNewEmptyGridItem() {
    let root = document.createElement('div');
    root.className = "grid-item";
    root.appendChild(document.createElement('div'));
    root.appendChild(document.createElement('div'));
    root.firstElementChild.className = "image-ui-container";
    root.lastElementChild.className = "sixteenbynine";
    let item = root.firstElementChild;
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
    return root;
}

function createGridItem(folder) {
    let gridItem = returnNewEmptyGridItem();
    folder.gridItem = gridItem;
    folder.title = folder.name.split(".")[0];
    folder.thumbnailIndex = 0;
    gridItem.firstElementChild.firstElementChild.lastElementChild.innerHTML = folder.title;
    gridItem.data = folder;

    let thumbElements = new DocumentFragment();
    for (let i=0; i<folder.images.length; i++) {
        let img = document.createElement('img');
        img.className = "gallery-image";
        img.alt = folder.title;
        img.src = folder.images[i].thumbnailLarge;
        thumbElements.appendChild(img);
        let dom = folder.images[i].dominantColor;
        let multiplier = 32/((dom.r+dom.g+dom.b)/3)
        folder.images[i].dominantColorDark = {
            r: dom.r * multiplier,
            g: dom.g * multiplier,
            b: dom.b * multiplier
        }
        folder.images[i].downloadUrl = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root:/" + folder.name + "/" + folder.images[i].name + ":/content";
    }

    gridItem.lastElementChild.appendChild(thumbElements);
    let rgb = getRGB(folder.images[0].dominantColorDark);
    gridItem.firstElementChild.firstElementChild.style.backgroundColor = rgb;
    gridItem.firstElementChild.lastElementChild.style.backgroundColor = rgb;
}

function getRGB(obj) {
    return "rgb(" + obj.r + "," + obj.g + "," + obj.b + ")";
}

function storeData(data) {
    for (let folder of data) {
        createGridItem(folder);
        window.itemData.push(folder);
    }
}

function startPreload() {
    window.preload = new Promise(function(resolve) {
        let request = new XMLHttpRequest();
        request.onload = (function(data) {
            let json = JSON.parse(data.target.response);
            storeData(json.folders);
            resolve("loaded");
        });
        request.open("get", "metadata.json", true);
        request.send();
    })
}
startPreload();
