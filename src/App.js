import React, { useState, useEffect } from 'react';
import { Button, Table, Spin, Select, DatePicker, ConfigProvider } from 'antd';
import * as XLSX from 'xlsx';
import { fetchData, summary, warehourse } from './utils/dataProcessing';
import './styles/App.css';
import moment from 'moment';
import 'moment/locale/zh-tw';
import zhTW from 'antd/lib/locale/zh_TW';

moment.locale('zh-tw');

const { Option } = Select;
const { MonthPicker } = DatePicker;

const keyMapping = {
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
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const selectedKeys = ['產品名稱', '分類', '單位', '採購單', '採購金額', '調撥單', '調撥金額', '報廢單', '報廢金額', '退貨單', '退貨金額', '親產品', '親產品金額', '子件', '子件金額'];

  const generateTable = async (store, date) => {
    setLoading(true);
    try {
      const records = await fetchData();
      setData(records);

      const { result, totals } = summary(records);
      setFilteredData(result);
      setTotals(totals);

      const storeData = await warehourse();
      setStores(storeData);

      if (records.length) {
        const cols = selectedKeys.map(key => ({
          title: key,
          dataIndex: key,
          key: key,
          render: (text) => (key.includes('金額') || key.includes('單') || key.includes('子件') || key.includes('親產品')) ? formatNumber(text) : text,
          sorter: (a, b) => {
            if (typeof a[key] === 'number' && typeof b[key] === 'number') {
              return a[key] - b[key];
            }
            if (typeof a[key] === 'string' && typeof b[key] === 'string') {
              return a[key].localeCompare(b[key]);
            }
            return 0;
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

  useEffect(() => {
    generateTable(selectedStore, selectedDate);
  }, []);

  const handleExport = () => {
    const wsData = [];
  
    wsData.push([`篩選條件: 店 ： ${selectedStore || '(全部)'} , 日期 ： ${selectedDate || '(全部)'}`]);
  
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
      return col.dataIndex.includes('金額') ? formatNumber(amount) : formatNumber(quantity);
    });
    wsData.push(totalRow);
  
    const headers = columns.map(col => col.title);
    wsData.push(headers);
    filteredData.forEach(record => {
      const row = columns.map(col => {
        const value = record[col.dataIndex];
        return (col.dataIndex.includes('金額') || col.dataIndex.includes('單') || col.dataIndex.includes('子件') || col.dataIndex.includes('親產品')) ? formatNumber(value) : value;
      });
      wsData.push(row);
    });
  
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, '庫存表.xlsx');
  };
  

  const handleStoreChange = (value) => {
    setLoading(true);
    setSelectedStore(value);
    filterData(value, selectedDate);
  };

  const handleDateChange = (date, dateString) => {
    setLoading(true);
    setSelectedDate(dateString);
    filterData(selectedStore, dateString);
  };

  const filterData = (store, date) => {
    let filtered = data;
    if (store && store !== '全部') {
      filtered = filtered.filter(item => item['入庫店'].value === store || item['出庫店'].value === store);
    }
    if (date) {
      filtered = filtered.filter(item => moment(item['異動日期'].value).format('YYYY-MM') === date);
    }
    const { result, totals } = summary(filtered);
    setFilteredData(result);
    setTotals(totals);
    setLoading(false);
  };


  const formatNumber = (num) => {
    return typeof num === 'number' ? num.toLocaleString() : num;
  };

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
    <ConfigProvider locale={zhTW}>
      <div className="container">
        <Spin spinning={loading} size="large">
          <div className="selectors-row">
            <div className="selector">
              <label>店：</label>
              <Select
                style={{ width: 200 }}
                placeholder="選擇店"
                onChange={handleStoreChange}
              >
              <Option key="all" value="全部">全部</Option>
              {stores.map((store, index) => (
                  <Option key={index} value={store['店名稱'].value}>
                    {store['店名稱'].value}
                  </Option>
              ))}
              </Select>
            </div>
            <div className="selector">
              <label>日期：</label>
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
