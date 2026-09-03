const htmlEl = document.documentElement;

const Caches = {};
var query = `
query ( $page: Int, $perPage: Int, $search: String) {
    Page(page: $page, perPage: $perPage) {
      characters(search: $search) {
        name {
          full
          native
        }
        image {
          medium
        }
      }
    }
  }
`;

const graphQLGet = async (keyword)=>{
    if(!keyword) return [];
    if(Caches['ani_' + keyword]) return Caches['ani_' + keyword];
    htmlEl.setAttribute('data-no-touch',true);
    var variables = {
        search: keyword,
    };
    var url = 'https://graphql.anilist.co',
    options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: query,
            variables: variables
        })
    };
    try {
        const f = await fetch(url, options);
        const data = await f.json();
        Caches['ani_' + keyword] = data?.data?.Page?.characters || [];
    } catch(err) {
        console.error('AniList search failed:', err);
        Caches['ani_' + keyword] = [];
    }
    htmlEl.setAttribute('data-no-touch',false);
    return Caches['ani_' + keyword];
}

const bangumiSearch = async (keyword)=>{
    if(!keyword) return [];
    const cacheKey = 'bgm_' + keyword;
    if(Caches[cacheKey]) return Caches[cacheKey];
    htmlEl.setAttribute('data-no-touch',true);

    let characters = [];
    // 1. 优先尝试本地 Edge 代理 /api/bangumi（部署在 Vercel 时可用）
    try {
        const res = await fetch('/api/bangumi?keyword=' + encodeURIComponent(keyword));
        if(res.ok){
            const data = await res.json();
            characters = data.data || [];
        } else {
            throw new Error('Proxy status: ' + res.status);
        }
    } catch (e) {
        // 2. 本地代理不可用（如本地静态文件直接打开），尝试直连官方 API
        try {
            const res = await fetch('https://api.bgm.tv/v0/search/characters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ keyword })
            });
            if(res.ok){
                const data = await res.json();
                characters = data.data || [];
            }
        } catch (err) {
            console.error('Bangumi direct search failed:', err);
        }
    }

    htmlEl.setAttribute('data-no-touch',false);
    Caches[cacheKey] = characters;
    return characters;
};

const get = async (url)=>{
    if(Caches[url]) return Caches[url];
    htmlEl.setAttribute('data-no-touch',true);
    const f = await fetch(url);
    const data = await f.json();
    Caches[url] = data;
    htmlEl.setAttribute('data-no-touch',false);
    return data;
}




const Images = {};

const loadImage = (src,onOver)=>{
    if(Images[src]) return onOver(Images[src]);
    const el = new Image();
    el.crossOrigin = 'Anonymous';
    el.src = src;
    el.onload = ()=>{
        onOver(el)
        Images[src] = el;
    }
};


const typeTexts = `最佳男主
最佳女主
最佳男配
最佳女配
我咋喜欢这人
爱过
讨厌
妈！
爸！
心灵导师
最憧憬
最强
最惨
最心机
最变态`;

const types = typeTexts.trim().split(/\n+/g);


const bangumiLocalKey = 'margiconch-animes-grid';


let bangumis = [];


const generatorDefaultBangumis = ()=> {
    bangumis = new Array(types.length).fill(null);
}

const getBangumiIdsText = ()=> bangumis.map(i=>String( i || 0 )).join(',')

const getBangumisFormLocalStorage = ()=>{
    if(!window.localStorage) return generatorDefaultBangumis();

    const bangumisText = localStorage.getItem(bangumiLocalKey);
    if(!bangumisText) return generatorDefaultBangumis();

    bangumis = bangumisText.split(/,/g).map(i=>/^\d+$/.test(i) ? +i : i);
}

getBangumisFormLocalStorage();
const saveBangumisToLocalStorage = ()=>{
    localStorage.setItem(bangumiLocalKey,getBangumiIdsText());
};

const clearData = () => {
    localStorage.removeItem(bangumiLocalKey)
    location.reload()
}


const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const bodyMargin = 20;
const contentWidth = 600;
const contentHeight = 560;


const col = 5;
const row = 3;

const colWidth = Math.ceil(contentWidth / col);
const rowHeight = Math.ceil(contentHeight / row);
const titleHeight = 40;
const fontHeight = 24;

const width = contentWidth + bodyMargin * 2;
const height = contentHeight + bodyMargin * 2 + titleHeight;
const scale = 3;


canvas.width = width * scale;
canvas.height = height * scale;

ctx.fillStyle = '#FFF';
ctx.fillRect(
    0,0, 
    width * scale,height * scale
);

ctx.textAlign = 'left';
ctx.font = `${9 * scale}px sans-serif`;
ctx.fillStyle = '#AAA';
ctx.textBaseline = 'middle';
ctx.lineCap  = 'round';
ctx.lineJoin = 'round';
ctx.fillText(
    '框架 @卜卜口 · 魔改 @ SSShooter · 角色数据来自 Bangumi / AniList · 禁止商业、盈利用途',
    19 * scale,
    (height - 10) * scale
);

ctx.scale(scale,scale);
ctx.translate(
    bodyMargin,
    bodyMargin + titleHeight
);

ctx.font = '16px sans-serif';
ctx.fillStyle = '#222';
ctx.textAlign = 'center';


ctx.save();


ctx.font = 'bold 24px sans-serif';
ctx.fillText('动画角色个人喜好表',contentWidth / 2, -24 );




ctx.lineWidth = 2;
ctx.strokeStyle = '#222';

for(let y = 0;y <= row;y++){

    ctx.beginPath();
    ctx.moveTo(0,y * rowHeight);
    ctx.lineTo(contentWidth,y * rowHeight);
    ctx.globalAlpha = 1;
    ctx.stroke();

    if( y === row) break;
    ctx.beginPath();
    ctx.moveTo(0,y * rowHeight + rowHeight - fontHeight);
    ctx.lineTo(contentWidth,y * rowHeight + rowHeight - fontHeight);
    ctx.globalAlpha = .2;
    ctx.stroke();
}
ctx.globalAlpha = 1;
for(let x = 0;x <= col;x++){
    ctx.beginPath();
    ctx.moveTo(x * colWidth,0);
    ctx.lineTo(x * colWidth,contentHeight);
    ctx.stroke();
}
ctx.restore();


for(let y = 0;y < row;y++){

    for(let x = 0;x < col;x++){
        const top = y * rowHeight;
        const left = x * colWidth;
        const type = types[y * col + x];
        ctx.fillText(
            type,
            left + colWidth / 2,
            top + rowHeight - fontHeight / 2,
        );
    }
}



let currentBangumiIndex = null;
const searchBoxEl = document.querySelector('.search-bangumis-box');
const formEl = document.querySelector('form');
const searchInputEl = formEl[0];
const animeListEl = document.querySelector('.anime-list');

const openSearchBox = (index)=>{
    currentBangumiIndex = index;
    htmlEl.setAttribute('data-no-scroll',true);
    searchBoxEl.setAttribute('data-show',true);
    
    searchInputEl.focus();

    const value = bangumis[currentBangumiIndex];

    if(!/^https/.test(value) && value !== 0){
        searchInputEl.value = value;
    }
        
}
const closeSearchBox = ()=>{
    htmlEl.setAttribute('data-no-scroll',false);
    searchBoxEl.setAttribute('data-show',false);
    searchInputEl.value = '';
    animeListEl.innerHTML = '';
};

const setCurrentBangumi =  (value)=>{

    bangumis[currentBangumiIndex] = value;
    saveBangumisToLocalStorage();
    drawBangumis();

    closeSearchBox();
}

const setInputText = ()=>{
    const text = searchInputEl.value.trim().replace(/,/g,'');
    setCurrentBangumi(text);
}

// 存储保持原始 URL，画进 canvas 时才走自家代理（带 CORS 头，避免画布污染）
// 代理用查询参数式（Vercel 的 catch-all 文件路由不可靠）
const toProxyURL = url => {
    if (!url) return '';
    try {
        const u = new URL(url);
        if (window.location.protocol.startsWith('http') && (u.hostname === 's4.anilist.co' || u.hostname === 'lain.bgm.tv')) {
            return '/api/img?host=' + u.hostname + '&path=' + encodeURIComponent(u.pathname + u.search);
        }
        return url;
    } catch(e) {
        return url;
    }
};

const sourceStorageKey = 'anime-grid-search-source';
let currentSource = localStorage.getItem(sourceStorageKey) || 'bangumi';

const sourceBtns = document.querySelectorAll('.source-btn');

const updateSourceUI = () => {
    sourceBtns.forEach(btn => {
        if (btn.dataset.source === currentSource) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    if (currentSource === 'bangumi') {
        searchInputEl.placeholder = '输入中文/日文/英文角色名搜索（推荐中文）';
    } else {
        searchInputEl.placeholder = '输入日文罗马音/日文汉字/英文搜索';
    }
};

sourceBtns.forEach(btn => {
    btn.onclick = () => {
        const newSource = btn.dataset.source;
        if (newSource === currentSource) return;
        currentSource = newSource;
        localStorage.setItem(sourceStorageKey, currentSource);
        updateSourceUI();
        if (searchInputEl.value.trim()) {
            formEl.onsubmit();
        }
    };
});
updateSourceUI();

animeListEl.onclick = e=>{
    const item = e.target.closest('.anime-item');
    if (!item || currentBangumiIndex === null) return;
    const url = item.dataset.url;
    if (url) {
        setCurrentBangumi(url);
    }
};

const searchFromAPI = async keyword=>{
    if (!keyword) {
        animeListEl.innerHTML = '';
        return;
    }
    animeListEl.innerHTML = '<div class="no-result">正在搜索角色...</div>';

    if (currentSource === 'bangumi') {
        const characters = await bangumiSearch(keyword);
        resetBangumiList(characters);
    } else {
        const characters = await graphQLGet(keyword);
        resetAniList(characters);
    }
}

const resetBangumiList = characters => {
    if (!characters || characters.length === 0) {
        animeListEl.innerHTML = '<div class="no-result">未在 Bangumi 找到相关角色，可尝试更换关键词或切换数据源</div>';
        return;
    }
    animeListEl.innerHTML = characters
        .filter(char => {
            return !!(char?.images?.medium || char?.images?.grid || char?.images?.large || char?.images?.small);
        })
        .map(char => {
            const img = char.images.medium || char.images.grid || char.images.large || char.images.small;
            let cnName = '';
            if (Array.isArray(char.infobox)) {
                const item = char.infobox.find(i => i && (i.key === '简体中文名' || i.key === '中文名'));
                if (item && typeof item.value === 'string' && item.value.trim()) {
                    cnName = item.value.trim();
                }
            }
            const mainName = cnName || char.name;
            const subName = (cnName && char.name && cnName !== char.name) ? `<span class="sub-name">(${char.name})</span>` : '';
            return `<div class="anime-item" data-url="${img}"><img src="${img}"><h3>${mainName}${subName}</h3></div>`;
        }).join('');
};

const resetAniList = characters => {
    if (!characters || characters.length === 0) {
        animeListEl.innerHTML = '<div class="no-result">未在 AniList 找到相关角色，可尝试更换关键词或切换数据源</div>';
        return;
    }
    animeListEl.innerHTML = characters
        .filter(character => character?.image?.medium)
        .map(anime => {
            const img = anime.image.medium;
            const mainName = anime.name.native || anime.name.full;
            const subName = (anime.name.native && anime.name.full && anime.name.native !== anime.name.full)
                ? `<span class="sub-name">(${anime.name.full})</span>` : '';
            return `<div class="anime-item" data-url="${img}"><img src="${img}"><h3>${mainName}${subName}</h3></div>`;
        }).join('');
};

formEl.onsubmit = e=>{
    if(e) e.preventDefault();

    const keyword = searchInputEl.value.trim();

    searchFromAPI(keyword);
}

formEl.onsubmit();




const imageWidth = colWidth - 2;
const imageHeight = rowHeight - fontHeight;
const canvasRatio = imageWidth / imageHeight;

ctx.font = 'bold 32px sans-serif';

const drawBangumis = ()=>{
    for(let index in bangumis){
        const urlOrString = bangumis[index];
        if(!urlOrString) continue;
        const x = index % col;
        const y = Math.floor(index / col);

        if(!/^https/.test(urlOrString)){ // 非链接

            ctx.save();
            ctx.fillStyle = '#FFF';
            ctx.fillRect(
                x * colWidth + 1,
                y * rowHeight + 1, 
                imageWidth,
                imageHeight,
            )
            ctx.restore();
            ctx.fillText(
                urlOrString,
                (x + 0.5) * colWidth,
                (y + 0.5) * rowHeight - 4, 
                imageWidth - 10,
            );
            continue;
        }
        
        loadImage(toProxyURL(urlOrString),el=>{
            const { naturalWidth, naturalHeight } = el;
            const originRatio = el.naturalWidth / el.naturalHeight;

            let sw, sh, sx, sy;
            if(originRatio < canvasRatio){
                sw = naturalWidth
                sh = naturalWidth / imageWidth * imageHeight;
                sx = 0
                sy = (naturalHeight - sh)
            }else{
                sh = naturalHeight
                sw = naturalHeight / imageHeight * imageWidth;
                sx = (naturalWidth - sw)
                sy = 0
            }

            ctx.drawImage(
                el,
                
                sx, sy,
                sw, sh, 

                x * colWidth + 1,
                y * rowHeight + 1, 
                imageWidth,
                imageHeight,
            );
        })
    }
}


const outputEl = document.querySelector('.output-box');
const outputImageEl = outputEl.querySelector('img');
const showOutput = imgURL=>{
    outputImageEl.src = imgURL;
    outputEl.setAttribute('data-show',true);
    htmlEl.setAttribute('data-no-scroll',true);
}
const closeOutput = ()=>{
    outputEl.setAttribute('data-show',false);
    htmlEl.setAttribute('data-no-scroll',false);
}

const downloadImage = ()=>{
    const fileName = '[薄红幻想][动画角色个人喜好表].jpg';
    const mime = 'image/jpeg';
    const imgURL = canvas.toDataURL(mime,0.8);
    const linkEl = document.createElement('a');
    linkEl.download = fileName;
    linkEl.href = imgURL;
    linkEl.dataset.downloadurl = [ mime, fileName, imgURL ].join(':');
    document.body.appendChild(linkEl);
    linkEl.click();
    document.body.removeChild(linkEl);

    showOutput(imgURL);
}

canvas.onclick = e=>{
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = e;
    const x = Math.floor(((clientX - rect.left) / rect.width * width - bodyMargin) / colWidth);
    const y = Math.floor(((clientY - rect.top) / rect.height * height  - bodyMargin - titleHeight) / rowHeight);

    if(x < 0) return;
    if(x > col) return;
    if(y < 0) return;
    if(y > row) return;

    const index = y * col + x;

    if(index >= col * row) return;

    openSearchBox(index);
}


drawBangumis();