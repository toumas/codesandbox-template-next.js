import type {NextPage} from 'next';
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
  {
    label: 'Timestamp',
    renderCell: (item: any) => new Date(item.createdOn).toLocaleString(),
  },
  {
    label: 'Gravity',
    renderCell: (item: any) => item.gravity,
  },
  {
    label: 'Temperature',
    renderCell: (item: any) => item.temperature,
  },
  {
    label: 'Battery',
    renderCell: (item: any) => item.battery,
  },
  {
    label: 'Signal',
    renderCell: (item: any) => item.rssi,
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

  const formattedData = filteredData.map((item: any) => ({
    ...item,
    createdOn: new Date(item.createdOn).toLocaleString(),
  }));

  return (
    <>
      <ResponsiveContainer width="100%" height={500}>
        <LineChart
          width={500}
          height={300}
          data={formattedData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="createdOn" />
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={['minData', 'maxData']}
          />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="temperature"
            stroke="#8884d8"
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="gravity"
            stroke="#82ca9d"
            dot={false}
          />
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
