#!/usr/bin/env node

/**
 * 牡丹楼大茶楼 · 复古粤语水单图像生成器 (SVG)
 *
 * 用法:
 *   node generate_receipt.js
 *   node generate_receipt.js --data '{"items": [...], "discount": 10}' --out ./output/my_receipt.svg
 *   node generate_receipt.js path/to/order.json
 */

const fs = require('fs');
const path = require('path');

// 默认影视剧金句暗号库（若外部未传入）
const DEFAULT_MEMES = [
  '飲啖茶，食個包，唔好急最緊要快！',
  '做人呢，最緊要就係開心',
  '你肚唔肚餓？我煮碗麵畀你食啊？',
  '一家人最緊要齊齊整整',
  '發生呢啲嘢，大家都唔想嘅',
  '有錢真係可以為所欲為㗎！',
  '做人如果冇夢想，同條鹹魚有咩分別啊？',
  '意唔意外？開唔開心？',
  '食屎啦，梁非凡！',
  '耶穌都留佢唔住，我話嘅！',
  '講呢啲！',
  '生仔未必就係福，要娶新抱要分屋',
  '冇得彈！',
  '大件夾抵食！',
  '得閒飲茶啦！'
];

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  let orderData = null;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === '--data' && args[i + 1]) {
      try {
        orderData = JSON.parse(args[i + 1]);
      } catch (e) {
        console.error('JSON解析失败:', e.message);
      }
      i++;
    } else if (!args[i].startsWith('--')) {
      // 假定为文件路径
      if (fs.existsSync(args[i])) {
        try {
          orderData = JSON.parse(fs.readFileSync(args[i], 'utf8'));
        } catch (e) {
          console.error('读取订单文件失败:', e.message);
        }
      }
    }
  }

  return { orderData, outputPath };
}

// 获取随机暗号
function getRandomMeme(memesFile) {
  try {
    if (fs.existsSync(memesFile)) {
      const memesData = JSON.parse(fs.readFileSync(memesFile, 'utf8'));
      const allMemes = [
        ...(memesData.tvb_classics || []),
        ...(memesData.stephen_chow || []),
        ...(memesData.guangdong_local || [])
      ];
      if (allMemes.length > 0) {
        return allMemes[Math.floor(Math.random() * allMemes.length)];
      }
    }
  } catch (e) {
    // 忽略异常，降级到默认
  }
  return DEFAULT_MEMES[Math.floor(Math.random() * DEFAULT_MEMES.length)];
}

// 格式化当前时间为粤语/老广格式
function formatCantoneseDate(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');

  let period = '朝早';
  if (hour >= 11 && hour < 14) period = '晏晝';
  else if (hour >= 14 && hour < 18) period = '下晝';
  else if (hour >= 18) period = '夜晚';

  return `${year}年${month}月${day}日 ${period} ${String(hour).padStart(2, '0')}:${min}:${sec}`;
}

// 生成小票锯齿边缘路径 (SVG path)
function generateJaggedEdge(width, yPos, toothWidth = 8, toothHeight = 4, isBottom = false) {
  let path = `M 0 ${yPos}`;
  const count = Math.ceil(width / toothWidth);
  for (let i = 0; i < count; i++) {
    const startX = i * toothWidth;
    const midX = startX + toothWidth / 2;
    const endX = Math.min((i + 1) * toothWidth, width);
    const peakY = isBottom ? yPos + toothHeight : yPos - toothHeight;
    path += ` L ${midX} ${peakY} L ${endX} ${yPos}`;
  }
  return path;
}

// 生成伪条形码 (SVG)
function generateBarcode(startX, startY, width, height) {
  const bars = [2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 2, 1, 2];
  let curX = startX;
  let svg = '';
  const totalWeight = bars.reduce((a, b) => a + b, 0);
  const unit = width / (totalWeight + bars.length);

  bars.forEach((weight, idx) => {
    if (idx % 2 === 0) {
      const barWidth = weight * unit;
      svg += `<rect x="${curX.toFixed(1)}" y="${startY}" width="${barWidth.toFixed(1)}" height="${height}" fill="#2B2824" />\n`;
      curX += barWidth;
    } else {
      curX += weight * unit;
    }
    curX += unit;
  });
  return svg;
}

function main() {
  const { orderData, outputPath } = parseArgs();

  // 默认模拟订单
  const defaultOrder = {
    orderId: 'MDL-' + Math.floor(100000 + Math.random() * 900000),
    table: '大廳 08 卡位',
    waiter: '發仔',
    teaType: '鐵觀音（滾水洗碗·茶位免收）',
    items: [
      { name: '生煎酥皮辣鳳腿包', note: '飛生菜、多醬', qty: '壹件', price: 22.0 },
      { name: '金絲油炸脆番薯條 (大)', note: '趁熱食', qty: '壹包', price: 13.5 },
      { name: '椒鹽酥炸香辣鳳羽', note: '周一開倉濟世·會員特惠', qty: '兩件', price: 0.0 },
      { name: '西洋清涼黑玉汽水', note: '隨心搭配·走冰', qty: '壹杯', price: 0.0 }
    ],
    heatLevel: 4, // 1~5星
    heatComment: '極度熱氣！食完記得灌兩碗廿四味降火',
    discount: 16.0
  };

  const order = orderData || defaultOrder;
  const referencesDir = path.join(__dirname, '..', 'references');
  const memesFile = path.join(referencesDir, 'cantonese_memes.json');

  const memeCode = order.pickupCode || getRandomMeme(memesFile);

  // 计算金额
  const subtotal = order.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const discount = Number(order.discount) || 0;
  const total = Math.max(0, subtotal - discount);

  // 动态高度估算
  const baseHeight = 580;
  const itemHeight = order.items.length * 36;
  const totalHeight = baseHeight + itemHeight;
  const width = 420;

  // 热气星星
  const heatStars = '★'.repeat(order.heatLevel || 3) + '☆'.repeat(5 - (order.heatLevel || 3));

  // 组装菜品明细 XML
  let itemRowsXml = '';
  let currentY = 232;

  order.items.forEach(item => {
    itemRowsXml += `
      <text x="35" y="${currentY}" font-size="13" font-weight="bold" fill="#2B2824">${item.name}</text>
      <text x="280" y="${currentY}" font-size="12" fill="#5A524A">${item.qty || '壹件'}</text>
      <text x="385" y="${currentY}" font-size="13" font-weight="bold" text-anchor="end" fill="#2B2824">$${Number(item.price).toFixed(1)}</text>
    `;
    if (item.note) {
      currentY += 16;
      itemRowsXml += `
        <text x="45" y="${currentY}" font-size="11" fill="#7D746B">└ (${item.note})</text>
      `;
      currentY += 20;
    } else {
      currentY += 24;
    }
  });

  const dividerY1 = currentY + 5;
  const heatY = dividerY1 + 22;
  const heatCommentY = heatY + 18;
  const dividerY2 = heatCommentY + 14;
  const calcStartY = dividerY2 + 22;
  const codeBoxY = calcStartY + 68;
  const stampCenterY = codeBoxY + 45;
  const barcodeY = codeBoxY + 115;
  const footerY = barcodeY + 52;
  const finalSvgHeight = footerY + 45;

  const orderTimeStr = order.time || formatCantoneseDate();

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${finalSvgHeight}" width="${width}" height="${finalSvgHeight}">
  <defs>
    <!-- 纸质微黄纹理 -->
    <linearGradient id="paperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FCF9F2" />
      <stop offset="50%" stop-color="#FAF6ED" />
      <stop offset="100%" stop-color="#F5F0E1" />
    </linearGradient>

    <!-- 红色复古印章滤镜 -->
    <filter id="stampRough">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
    </filter>

    <style>
      .font-title { font-family: "SimSun", "Songti SC", "STSong", "Microsoft YaHei", serif; }
      .font-mono { font-family: "Courier New", "SimSun", monospace; }
      .font-sans { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; }
    </style>
  </defs>

  <!-- 票据底纸与阴影 -->
  <rect x="15" y="10" width="${width - 30}" height="${finalSvgHeight - 20}" fill="url(#paperGrad)" stroke="#E4DBCB" stroke-width="1" rx="2" />

  <!-- 顶部撕纸锯齿 -->
  <path d="${generateJaggedEdge(width - 30, 10, 10, 4, false)}" fill="#ECE6D8" transform="translate(15, 0)" />

  <!-- 抬头：茶楼招牌 -->
  <g class="font-title" text-anchor="middle">
    <text x="${width / 2}" y="45" font-size="20" font-weight="900" letter-spacing="4" fill="#8B1D1D">牡丹樓大茶樓</text>
    <text x="${width / 2}" y="66" font-size="10" letter-spacing="2" fill="#756D63">省港老字號 · 水滾茶靚 · 創於光緒年間</text>
    <rect x="${width / 2 - 90}" y="76" width="180" height="20" fill="#8B1D1D" rx="2" />
    <text x="${width / 2}" y="90" font-size="11" font-weight="bold" fill="#FFFFFF" letter-spacing="1">【 堂食茶市水單 / 外賣單 】</text>
  </g>

  <!-- 订单基本信息 -->
  <g class="font-mono" font-size="11" fill="#4A443C">
    <text x="35" y="120">單號：<tspan font-weight="bold" fill="#2B2824">${order.orderId}</tspan></text>
    <text x="35" y="138">開單：${orderTimeStr}</text>
    <text x="35" y="156">堂倌：<tspan font-weight="bold">${order.waiter}</tspan>   |  枱號：${order.table}</text>
    <text x="35" y="174">茶位：${order.teaType}</text>
  </g>

  <!-- 虚线分隔线 1 -->
  <line x1="30" y1="188" x2="${width - 30}" y2="188" stroke="#9E9484" stroke-width="1" stroke-dasharray="4,3" />

  <!-- 表头（去除生硬实线，优化呼吸感与字色） -->
  <g class="font-title" font-size="12" font-weight="bold" fill="#5A524A">
    <text x="35" y="208">點心明細</text>
    <text x="275" y="208">數量</text>
    <text x="385" y="208" text-anchor="end">銀兩</text>
  </g>

  <!-- 菜品列表 -->
  <g class="font-sans">
    ${itemRowsXml}
  </g>

  <!-- 虚线分隔线 2 -->
  <line x1="30" y1="${dividerY1}" x2="${width - 30}" y2="${dividerY1}" stroke="#9E9484" stroke-width="1" stroke-dasharray="4,3" />

  <!-- 老中医养生监测 -->
  <g class="font-title">
    <text x="35" y="${heatY}" font-size="12" font-weight="bold" fill="#A83232">【 養生老中醫監測 】</text>
    <text x="165" y="${heatY}" font-size="13" font-weight="bold" fill="#D32F2F" letter-spacing="2">熱氣指數：${heatStars}</text>
    <text x="35" y="${heatCommentY}" font-size="11" fill="#6B6256" class="font-sans">(老中醫叮囑：${order.heatComment || '清淡降火，切勿貪食'})</text>
  </g>

  <!-- 虚线分隔线 3 -->
  <line x1="30" y1="${dividerY2}" x2="${width - 30}" y2="${dividerY2}" stroke="#9E9484" stroke-width="1" stroke-dasharray="4,3" />

  <!-- 金额计算 -->
  <g class="font-mono" font-size="12" fill="#4A443C">
    <text x="35" y="${calcStartY}">原價合計：</text>
    <text x="385" y="${calcStartY}" text-anchor="end" font-weight="bold">$${subtotal.toFixed(1)} 蚊</text>

    <text x="35" y="${calcStartY + 18}" fill="#A83232">街坊人情折：</text>
    <text x="385" y="${calcStartY + 18}" text-anchor="end" font-weight="bold" fill="#A83232">-$${discount.toFixed(1)} 蚊</text>

    <text x="35" y="${calcStartY + 38}" font-size="14" font-weight="bold" fill="#2B2824">實收銀兩：</text>
    <text x="385" y="${calcStartY + 38}" text-anchor="end" font-size="16" font-weight="bold" fill="#8B1D1D">$${total.toFixed(1)} 蚊</text>
  </g>

  <!-- 碰头暗号框 -->
  <g transform="translate(30, ${codeBoxY})">
    <rect x="0" y="0" width="${width - 60}" height="76" fill="#F4EEE1" stroke="#8B1D1D" stroke-width="1.5" stroke-dasharray="6,2" rx="4" />
    <text x="${(width - 60) / 2}" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#8B1D1D" class="font-title" letter-spacing="2">【 牡丹樓·堂食碰頭暗號 】</text>
    
    <!-- 经典影视金句 -->
    <rect x="12" y="26" width="${width - 84}" height="30" fill="#FFFFFF" stroke="#D1C7B7" rx="3" />
    <text x="${(width - 60) / 2}" y="46" text-anchor="middle" font-size="12" font-weight="bold" fill="#1F1C18" class="font-title">「 ${memeCode} 」</text>
    
    <text x="${(width - 60) / 2}" y="68" text-anchor="middle" font-size="9" fill="#8C8275" class="font-sans">(憑此暗號向前台小二領餐，對唔上暗號唔准走)</text>
  </g>

  <!-- 红色复古印章 -->
  <g transform="translate(320, ${stampCenterY}) rotate(-10)" filter="url(#stampRough)">
    <circle cx="0" cy="0" r="28" fill="none" stroke="#C62828" stroke-width="2.5" stroke-dasharray="14,2,8,2" />
    <circle cx="0" cy="0" r="24" fill="none" stroke="#C62828" stroke-width="1" />
    <text x="0" y="-4" text-anchor="middle" font-size="11" font-weight="900" fill="#C62828" class="font-title" letter-spacing="2">牡丹樓</text>
    <text x="0" y="12" text-anchor="middle" font-size="10" font-weight="900" fill="#C62828" class="font-title" letter-spacing="3">銀訖</text>
  </g>

  <!-- 条形码 -->
  <g>
    ${generateBarcode(70, barcodeY, width - 140, 24)}
    <text x="${width / 2}" y="${barcodeY + 34}" text-anchor="middle" font-size="9" font-family="Courier New, monospace" fill="#665F55" letter-spacing="3">★ VERIFIED ORDER ★</text>
  </g>

  <!-- 底部告示 -->
  <g class="font-title" text-anchor="middle" font-size="10" fill="#756D63">
    <text x="${width / 2}" y="${footerY}">★ 得閒常嚟飲茶！包包新鮮出爐，小心辣親嘴！★</text>
    <text x="${width / 2}" y="${footerY + 16}">★ 憑此單可向前台小二領番茄醬包貳包 · 水滾茶靚 ★</text>
  </g>

  <!-- 底部撕纸锯齿 -->
  <path d="${generateJaggedEdge(width - 30, finalSvgHeight - 10, 10, 4, true)}" fill="#ECE6D8" transform="translate(15, 0)" />
</svg>`;

  const outDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const targetFile = outputPath || path.join(outDir, `receipt_${Date.now()}.svg`);
  fs.writeFileSync(targetFile, svgContent, 'utf8');

  console.log(`[牡丹楼水单生成成功]: ${targetFile}`);
  return targetFile;
}

if (require.main === module) {
  main();
}

module.exports = { main };
