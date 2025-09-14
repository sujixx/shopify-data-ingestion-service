import React from 'react';
import { Card, Table, Tag, Typography } from 'antd';
import { useRealTimeData } from '../../hooks/useRealTimeData';

const { Text } = Typography;

const CustomersTab: React.FC = () => {
  const { data, loading } = useRealTimeData();

  const columns = [
    {
      title: 'Customer',
      dataIndex: 'email',
      key: 'email',
      render: (email: string, record: any) => (
        <>
          <Text strong>{email}</Text>
          <Text type="secondary">{` (${record.firstName || ''} ${record.lastName || ''})`}</Text>
        </>
      ),
    },
    {
      title: 'Total Spent',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      render: (value: number) => <Tag color="green">${value?.toFixed(2)}</Tag>,
      sorter: (a: any, b: any) => a.totalSpent - b.totalSpent,
    },
    {
      title: 'Orders',
      dataIndex: 'ordersCount',
      key: 'ordersCount',
      sorter: (a: any, b: any) => a.ordersCount - b.ordersCount,
    },
    {
      title: 'Last Order',
      dataIndex: 'lastOrderDate',
      key: 'lastOrderDate',
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString() : 'No orders',
    },
  ];

  return (
    <Card title="Top 5 Customers by Spend">
      <Table
        columns={columns}
        dataSource={data?.topCustomers || []}
        rowKey="id"
        loading={loading}
        pagination={false}
        bordered
      />
    </Card>
  );
};

export default CustomersTab;
