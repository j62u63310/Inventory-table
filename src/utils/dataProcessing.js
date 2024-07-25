export async function fetchData() {
    const appID = kintone.app.getId();
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
};

export function summary(records) {
  const aggregated = {};
  const totals = {
    amount: {},
    quantity: {}
  };

  records.forEach(record => {
    const productName = record['產品名稱'].value;
    const category = record['分類名稱'].value;
    const unit = record['異動單位'].value;
    const source = record['異動來源'].value;
    const amount = Math.abs(parseFloat(record['異動金額'].value));
    const quantity = Math.abs(parseFloat(record['異動數量'].value));

    const key = `${productName}-${category}-${unit}`;

    if (!aggregated[key]) {
      aggregated[key] = {};
    }

    if (!aggregated[key][source]) {
      aggregated[key][source] = { amount: 0, quantity: 0 };
    }

    aggregated[key][source].amount += amount;
    aggregated[key][source].quantity += quantity;

    // 計算每一列的總和
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
      [keyMapping["產品名稱"]]: productName, 
      [keyMapping["分類名稱"]]: category, 
      [keyMapping["異動單位"]]: unit 
    };

    Object.keys(aggregated[key]).forEach(source => {
      const mappedSource = keyMapping[source] || source;
      row[mappedSource] = aggregated[key][source].quantity;
      row[keyMapping[`${source}金額`] || `${source}金額`] = aggregated[key][source].amount;
    });

    result.push(row);
  });

  // 轉換 totals 中的 key
  const mappedTotals = {
    amount: {},
    quantity: {}
  };
  Object.keys(totals.amount).forEach(key => {
    const mappedKey = keyMapping[key] || key;
    mappedTotals.amount[mappedKey] = totals.amount[key];
    mappedTotals.quantity[mappedKey] = totals.quantity[key];
  });

  return { result, totals: mappedTotals };
}


export async function warehourse() {
  const getRecord = {
    app: "3",
    query: ``
  }
  const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', getRecord);
  return resp.records;
}