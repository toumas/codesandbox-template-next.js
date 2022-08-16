import type {NextPage} from 'next';
import {parse} from 'date-fns';
import Head from 'next/head';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {CompactTable} from '@table-library/react-table-library/compact';
import {useSort} from '@table-library/react-table-library/sort';

const COLUMNS = [
  {label: 'Timestamp', renderCell: (item) => item.createdOn},
  {
    label: 'Gravity',
    renderCell: (item) => item.gravity,
  },
  {
    label: 'Temperature',
    renderCell: (item) => item.temperature,
  },
  {
    label: 'Battery',
    renderCell: (item) => item.battery,
  },
  {
    label: 'Signal',
    renderCell: (item) => item.rssi,
  },
];

const Home: NextPage = (props: any) => {
  const filteredData = props.data.filter((item: any) => item.gravity < 1140);
  const sort = useSort(
    filteredData,
    {
      state: {
        sortKey: 'Timestamp',
        reverse: true,
      },
    },
    {
      sortFns: {
        Timestamp: (array) =>
          array.sort((a, b) => a.createdOn.localeCompare(b.createdOn)),
      },
    },
  );

  return (
    <>
      <ResponsiveContainer width="100%" height={500}>
        <LineChart
          width={500}
          height={300}
          data={filteredData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="createdOn" />
          <YAxis domain={['minData', 'maxData']} />
          <Tooltip />
          <Legend />
          {/* <Line type="monotone" dataKey="temperature" stroke="#8884d8" activeDot={{ r: 8 }} /> */}
          <Line type="monotone" dataKey="gravity" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
      <CompactTable sort={sort} columns={COLUMNS} data={{nodes: props.data}} />
    </>
  );
};

export default Home;

export async function getStaticProps() {
  const res = await fetch('https://id.rapt.io/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: 'rapt-user',
      grant_type: 'password',
      username: 'rapt@tuoto.xyz',
      password: process.env.RAPT_PORTAL_SECRET as string,
    }),
  });
  const {access_token} = await res.json();
  const hydrometersRes = await fetch(
    'https://api.rapt.io/api/Hydrometers/GetHydrometers',
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        accept: 'application/json',
      },
    },
  );
  const {
    activeProfileSession: {hydrometerId, startDate},
  } = (await hydrometersRes.json())[0];
  const formattedStartDate = startDate.slice(0, -6) + 'Z';
  const telemetryRes = await fetch(
    `https://api.rapt.io/api/Hydrometers/GetTelemetry?hydrometerId=${hydrometerId}&startDate=${formattedStartDate}&endDate=${new Date().toJSON()}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        accept: 'application/json',
      },
    },
  );
  const telemetryData = await telemetryRes.json();
  return {revalidate: 1, props: {data: telemetryData}};
}
