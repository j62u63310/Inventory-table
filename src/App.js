import React, { useState, useEffect } from 'react';
import { Button, Table, Spin, Select, DatePicker, ConfigProvider } from 'antd';
import * as XLSX from 'xlsx';
import { fetchData, summary, warehourse } from './utils/dataProcessing';
import './styles/App.css';
import moment from 'moment';


const { Option } = Select;
const { MonthPicker } = DatePicker;

const keyMapping = {
  "盤點金額": "盤點金額",
  "期初盤點": "期初盤點",
  "採購金額": "採購單",
  "調撥金額": "調撥單",
  "報廢金額": "報廢單",
  "退貨金額": "退貨單",
  "親產品金額": "親產品",
  "子件金額": "子件",
};

const App = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [totals, setTotals] = useState({ amount: {}, quantity: {} });
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [product, setProduct] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const selectedKeys = ['產品名稱', '分類', '單位', '期初盤點', '採購單', '採購金額', '調撥單', '調撥金額','轉售使用','轉售金額', '報廢單', '報廢金額', '退貨單', '退貨金額', '親產品', '親產品金額', '子件', '子件金額', '當月盤點', '盤點金額'];
  const selectedWidth = {
    '產品名稱':300,
    '分類':250,
    '單位':150,
    '期初盤點':100,
    '採購單':100,
    '採購金額':100,
    '調撥單':100,
    '調撥金額':100,
    '轉售使用': 100,
    '轉售金額': 100,
    '報廢單':100,
    '報廢金額':100,
    '退貨單':100,
    '退貨金額':100,
    '親產品':100,
    '親產品金額':100,
    '子件':100,
    '子件金額':100,
    '當月盤點':100,
    '盤點金額':100,
  }

  const numberType = ['期初盤點', '採購單', '採購金額', '調撥單', '調撥金額','轉售使用','轉售金額', '報廢單', '報廢金額', '退貨單', '退貨金額', '親產品', '親產品金額', '子件', '子件金額', '當月盤點', '盤點金額'];
  const fixed = ['產品名稱', '分類', '單位'];

  //初始更新表格
  useEffect(() => {
    const fetchDataAndUpdate = async () => {
        try {
            const records = await fetchData(kintone.app.getId());
            setData(records);

            const { result, totals } = summary(records);
            setFilteredData(result);
            setTotals(totals);

            const fetchedStores = await warehourse();
            setStores(fetchedStores);

            const fetchedProduct = await fetchData("2");
            setProduct(fetchedProduct);

            if (records.length) {
                const cols = selectedKeys.map(key => ({
                    title: key,
                    dataIndex: key,
                    key: key,
                    width: selectedWidth[key],
                    fixed: fixed.includes(key) ? 'left' : "",
                    render: (text) => (key.includes('金額') || key.includes('單') || key.includes('子件') || key.includes('親產品')) ? formatNumber(text) : text,
                    sorter: (a, b) => {
                        if (numberType.includes(key)) {
                            const aVal = a[key] === null || a[key] === undefined ? 0 : a[key];
                            const bVal = b[key] === null || b[key] === undefined ? 0 : b[key];
                            return aVal - bVal;
                        } else {
                            const aVal = a[key] === null || a[key] === undefined ? "" : a[key];
                            const bVal = b[key] === null || b[key] === undefined ? "" : b[key];
                            return aVal.localeCompare(bVal);
                        }
                    }
                }));
                setColumns(cols);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    fetchDataAndUpdate();
}, []);
  
  useEffect(() => {
    let filtered = data;

    if (selectedStore && selectedStore !== '全部') {
        filtered = filtered.filter(item => 
            item['入倉倉庫名稱'].value === selectedStore || 
            item['出倉倉庫名稱'].value === selectedStore
        );
    }

    if (selectedDate) {
        filtered = filtered.filter(item => 
            moment(item['單據日期'].value).format('YYYY-MM') === selectedDate
        );
    }

    if (selectedProduct && selectedProduct !== '全部') {
        filtered = filtered.filter(item =>
            item["產品名稱"].value === selectedProduct
        );
    }

    const { result, totals } = summary(filtered);
    setFilteredData(result);
    setTotals(totals);
}, [data, selectedDate, selectedStore, selectedProduct]);

  //匯出EXCEL
  const handleExport = () => {
    const wsData = [];
  
    wsData.push([`篩選條件: 產品：${selectedProduct} ,倉庫 ： ${selectedStore} , 日期(月份) ： ${selectedDate || '全部'}`]);
  
    let isFirstTotalCell = true;
    const totalRow = columns.map(col => {
      if (isFirstTotalCell && ['產品名稱', '分類', '單位'].includes(col.dataIndex)) {
        isFirstTotalCell = false;
        return '總計';
      }
      if (['產品名稱', '分類', '單位'].includes(col.dataIndex)) {
        return '';
      }
      const quantity = totals.quantity[col.dataIndex] || 0;
      const amountKey = keyMapping[col.dataIndex];
      const amount = amountKey ? totals.amount[amountKey] || 0 : 0;
      return col.dataIndex.includes('金額') ? amount : quantity;
    });
    wsData.push(totalRow);
  
    const headers = columns.map(col => col.title);
    wsData.push(headers);
    filteredData.forEach(record => {
      const row = columns.map(col => {
        return record[col.dataIndex];
      });
      wsData.push(row);
    });
  
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, '庫存表.xlsx');
  };

  //顯示千分位
  const formatNumber = (num) => {
    return typeof num === 'number' ? num.toLocaleString() : num;
  };

  const handleProductChange = (value) => {
    setSelectedProduct(value)
  }

  const handleStoreChange = (value) => {
    setSelectedStore(value);
  };

  const handleDateChange = (date, dateString) => {
    setSelectedDate(dateString);
  };

  const uniqueProducts = Array.from(new Set(product.map(record => record['title'].value)))
  .map(name => {
    return product.find(record => record['title'].value === name);
  });

  const summaryRow = () => {
    return (
      <Table.Summary fixed>
        <Table.Summary.Row>
          {columns.map((col, index) => {
            if (['產品名稱', '分類', '單位'].includes(col.dataIndex)) {
              return <Table.Summary.Cell key={col.dataIndex} index={index}>{index === 0 ? '總計' : ''}</Table.Summary.Cell>;
            }
            const quantity = totals.quantity[col.dataIndex] || 0;
            const amountKey = keyMapping[col.dataIndex];
            const amount = amountKey ? totals.amount[amountKey] || 0 : 0;

            return (
              <Table.Summary.Cell key={col.dataIndex} index={index}>
                {col.dataIndex.includes('金額') ? (
                  <div>{formatNumber(amount)}</div>
                ) : (
                  <div>{formatNumber(quantity)}</div>
                )}
              </Table.Summary.Cell>
            );
          })}
        </Table.Summary.Row>
      </Table.Summary>
    );
  };

  return (
    <ConfigProvider>
      <div className="container">
        <Spin spinning={loading} size="large">
          <div className="selectors-row">
            <div className="selector">
                <label>產品：</label>
                <Select
                  showSearch
                  optionFilterProp="children"
                  style={{ width: 200 }}
                  placeholder="選擇產品"
                  onChange={handleProductChange}
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                <Option key="all" value="全部">全部</Option>
                {uniqueProducts.map((record, index) => (
                    <Option key={index} value={record['title'].value}>
                      {record['title'].value}
                    </Option>
                ))}
                </Select>
            </div>
            <div className="selector">
              <label>倉庫：</label>
              <Select
                showSearch
                optionFilterProp="children"
                style={{ width: 200 }}
                placeholder="選擇倉庫"
                onChange={handleStoreChange}
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
              <Option key="all" value="全部">全部</Option>
              {stores.map((store, index) => (
                  <Option key={index} value={store['倉庫名稱'].value}>
                    {store['倉庫名稱'].value}
                  </Option>
              ))}
              </Select>
            </div>
            <div className="selector">
              <label>日期(月份)：</label>
              <MonthPicker
                style={{ width: 200 }}
                placeholder="選擇日期"
                onChange={handleDateChange}
                format="YYYY-MM"
              />
            </div>
            <Button type="default" onClick={handleExport} className="export-button" disabled={!filteredData.length}>
              匯出Excel
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={filteredData}
            pagination={false}
            scroll={{ x: 1500, y: 500 }}
            summary={summaryRow}
          />
        </Spin>
      </div>
    </ConfigProvider>
  );
};

export default App;
