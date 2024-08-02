export async function fetchData(appID) {
  let allRecords = [];
  let offset = 0;
  const limit = 500;

  try {
    while (true) {
      const getRecord = {
        app: appID,
        query: `limit ${limit} offset ${offset}`
      }
      const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', getRecord);
      allRecords = allRecords.concat(resp.records);
      offset += limit;
      if (resp.records.length < limit) {
        break;
      }
    }
  } catch (err) {
    console.error(`fetchData: ${err}`);
    throw err;
  }

  return allRecords;
}


const keyMapping = {
  "期初盤點": '期初盤點',
  "產品名稱": '產品名稱',
  "分類名稱": '分類',
  "異動單位": '單位',
  "採購單": '採購單',
  "採購單金額": '採購金額',
  "調撥單-撥出": "調撥單",
  "調撥單-撥出金額": "調撥金額",
  "報廢單": "報廢單",
  "報廢單金額": "報廢金額",
  "退貨單": "退貨單",
  "退貨單金額": "退貨金額",
  "組合工單-親產品": "親產品",
  "組合工單-親產品金額": "親產品金額",
  "組合工單-子件": "子件",
  "組合工單-子件金額": "子件金額",
  "當月盤點": "當月盤點",
  "盤點金額": "盤點金額",
};

export function summary(records) {
  const aggregated = {};
  const totals = {
    amount: {
      '盤點金額': 0
    },
    quantity: {
      '當月盤點' :0
    }
  };

  records.forEach(record => {
    const productName = record['產品名稱'].value || "Unknown";
    const category = record['分類名稱'].value || "Unknown";
    const unit = record['單位_採出盤'].value || "Unknown";
    const source = record['異動來源'].value || "Unknown";
    const amount = Math.abs(parseFloat(record['異動金額'].value || 0));
    const quantity = Math.abs(parseFloat(Number(record['採出盤數量'].value || 0)));

    const key = `${productName}-${category}-${unit}`;

    if (!aggregated[key]) {
      aggregated[key] = {};
    }

    if (!aggregated[key][source]) {
      aggregated[key][source] = { amount: 0, quantity: 0 };
    }

    aggregated[key][source].amount += amount;
    aggregated[key][source].quantity += quantity;

    const mappedKey = keyMapping[source] || source;
    if (!totals.amount[mappedKey]) {
      totals.amount[mappedKey] = 0;
    }
    if (!totals.quantity[mappedKey]) {
      totals.quantity[mappedKey] = 0;
    }
    totals.amount[mappedKey] += amount;
    totals.quantity[mappedKey] += quantity;
  });
  
  const result = [];
  Object.keys(aggregated).forEach(key => {
    const [productName, category, unit] = key.split('-');
    const row = { 
      '產品名稱': productName, 
      '分類': category, 
      '單位': unit 
    };

    let 當月盤點 = 0;
    let 盤點金額 = 0;

    Object.keys(aggregated[key]).forEach(source => {
      const mappedSource = keyMapping[source] || source;
      row[mappedSource] = aggregated[key][source].quantity;
      row[keyMapping[`${source}金額`] || `${source}金額`] = aggregated[key][source].amount;

      當月盤點 += aggregated[key][source].quantity;
      盤點金額 += aggregated[key][source].amount;
    });

    row['當月盤點'] = 當月盤點;
    row['盤點金額'] = 盤點金額;

    // 累加到 totals 中
    totals.quantity['當月盤點'] += 當月盤點;
    totals.amount['盤點金額'] += 盤點金額;

    result.push(row);
  });

  const mappedTotals = {
    amount: {},
    quantity: {}
  };

  Object.keys(totals.amount).forEach(key => {
    const mappedKey = keyMapping[key] || key;
    mappedTotals.amount[mappedKey] = totals.amount[key];
  });

  Object.keys(totals.quantity).forEach(key => {
    const mappedKey = keyMapping[key] || key;
    mappedTotals.quantity[mappedKey] = totals.quantity[key];
  });

  return { result, totals: mappedTotals };
}

export async function warehourse() {
  const getRecord = {
    app: "1",
    query: ``
  }
  const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', getRecord);
  return resp.records;
}
