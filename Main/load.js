import {ANIMS} from './graphics.js';
const LEVEL_FILENAMES = [
    "L1.json",
    "L0.json",

];
const LEVEL_FILE_PATH = "./Levels/";
const ANIM_FILE_PATH = "./images/AnimMeta/";

function loadJsonFile(fileName, path) {
    return fetch(path + fileName, {mode:"cors"})
        .then(response => response.json());
}

async function loadJsonFiles(fileNames, path) {
    const jsons = fileNames.map(fileName => {return {fileName:fileName, promise: loadJsonFile(fileName, path)}});
    for(const meta of jsons) {
        const promise = meta.promise;
        meta.json = await promise;
    }
    return jsons;
}

export {
    loadJsonFiles, loadJsonFile,
    LEVEL_FILENAMES, LEVEL_FILE_PATH,
    ANIM_FILE_PATH,
}