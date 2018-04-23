/*eslint-env es6, browser*/

window.itemData = new Map();

function returnNewEmptyGridItem() {
    let item = document.createElement('div');
    item.setAttribute("class", "grid-item");
    item.innerHTML =
        "<div class='image-ui-container'>\
            <div class='image-bar'>\
                <span class='image-menubutton'><div></div><div></div><div></div></span>\
                <span class='image-title'></span>\
            </div>\
            <div class='image-frame'></div>\
        </div>\
        <div class='sixteenbynine'>\
        </div>";
    return item;
}

function createGridItem(folder) {
    let gridItem = returnNewEmptyGridItem();
    folder.gridItem = gridItem;
    folder.title = folder.name.split(".")[0];
    folder.thumbnailIndex = 0;
    gridItem.children[0].children[0].children[1].innerHTML = folder.title;
    gridItem.data = folder;


    let thumbElements = new DocumentFragment();
    for (let i=0; i<folder.images.length; i++) {
        let img = document.createElement('img');
        img.setAttribute("class", "gallery-image");
        img.setAttribute("alt", folder.title);
        img.setAttribute("src", folder.images[i].thumbnailLarge);
        thumbElements.appendChild(img);
        let r = folder.images[i].dominantColor.r;
        let g = folder.images[i].dominantColor.g;
        let b = folder.images[i].dominantColor.b;
        let multiplier = 32/((r+g+b)/3)
        folder.images[i].dominantColorDark = {
            r: r * multiplier,
            g: g * multiplier,
            b: b * multiplier
        }
        folder.images[i].downloadUrl = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root:/" + folder.name + "/" + folder.images[i].name + ":/content";
    }

    gridItem.children[1].appendChild(thumbElements);
    gridItem.children[0].children[0].style.backgroundColor = folder.images[0].dominantColorDark;
    gridItem.children[0].children[1].style.backgroundColor = folder.images[0].dominantColorDark;
}

function storeData(data) {
    for (let folder of data) {
        if (!window.itemData.has(folder.name)) {
            createGridItem(folder);
            window.itemData.set(folder.name, folder);
        }
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
