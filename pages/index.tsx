import styles from '../styles/Home.module.css';
import type {NextPage} from 'next';
import {useEffect, useState} from 'react';
import useSWR from 'swr';
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
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {TableNode} from '@table-library/react-table-library';

export interface Telemetry {
  temperature: number;
  gravity: number;
  battery: number;
  version: string;
  createdOn: Date;
  macAddress: string;
  rssi: number;
}

const fetcher = (url: string, options: RequestInit) =>
  fetch(url, options).then((res) => res.json());

const COLUMNS = [
  {
    label: 'Timestamp',
    renderCell: (item: TableNode) => new Date(item.createdOn).toLocaleString(),
  },
  {
    label: 'Gravity',
    renderCell: (item: TableNode) => item.gravity,
  },
  {
    label: 'Temperature',
    renderCell: (item: TableNode) => item.temperature,
  },
  {
    label: 'Battery',
    renderCell: (item: TableNode) => item.battery,
  },
  {
    label: 'Signal',
    renderCell: (item: TableNode) => item.rssi,
  },
];

interface HomeProps {
  access_token: string;
  hydrometerId: string;
  startDate: string;
  data: Telemetry[];
}

const Home: NextPage<HomeProps> = (props) => {
  const [data, setData] = useState(props.data);
  const filteredData = data.filter((item: Telemetry) => item.gravity < 1140);
  const nodes = filteredData.map((item) => ({
    ...item,
    id: item.createdOn.toString(),
  }));
  const sort = useSort(
    {nodes},
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
  const firstTelemetryDate = data[0].createdOn;
  const lastTelemetryDate = data[data.length - 1].createdOn;
  const formattedData = filteredData.map((item: any) => ({
    ...item,
    createdOn: new Date(item.createdOn).toLocaleString(),
  }));
  const [locale, setLocale] = useState<string>();
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(firstTelemetryDate),
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date(lastTelemetryDate),
  );
  const [isDatePickersDirty, setIsDatePickerDirty] = useState(false);

  const [fallbackData, setFallbackData] = useState(formattedData);
  const {data: fetchedData, error} = useSWR<Telemetry[]>(
    () =>
      isDatePickersDirty &&
      props.access_token &&
      props.hydrometerId &&
      startDate &&
      endDate && [
        `/api/getTelemetryByRange?hydrometerId=${
          props.hydrometerId
        }&startDate=${startDate.toJSON()}&endDate=${endDate.toJSON()}&token=${
          props.access_token
        }`,
      ],
    fetcher,
    {
      onSuccess(data) {
        setFallbackData(data);
      },
    },
  );
  const isLoading = !error && !fetchedData;

  useEffect(() => {
    if (Array.isArray(fetchedData) && fetchedData.length > 0) {
      setData(fetchedData);
    }
  }, [fetchedData]);

  let dataToShow;
  if (isLoading || error) {
    dataToShow = fallbackData;
  } else if (fetchedData) {
    dataToShow = fetchedData;
  }

  useEffect(() => {
    setLocale(navigator.language.substring(0, 2));
  }, []);

  return (
    <>
      <div className={styles.row}>
        <span>From:</span>
        <DatePicker
          selected={startDate}
          showTimeSelect={true}
          minDate={startDate}
          locale={locale}
          dateFormat="Pp"
          onChange={(date: Date) => {
            setIsDatePickerDirty(true);
            setStartDate(date);
          }}
        />
        <span>To:</span>
        <DatePicker
          selected={endDate}
          showTimeSelect={true}
          maxDate={new Date()}
          locale={locale}
          dateFormat="Pp"
          onChange={(date: Date) => {
            setIsDatePickerDirty(true);
            setEndDate(date);
          }}
        />
      </div>
      <ResponsiveContainer width="100%" height={500}>
        <LineChart width={500} height={300} data={dataToShow}>
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
      <CompactTable sort={sort} columns={COLUMNS} data={{nodes}} />
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
  const telemetryData = (await telemetryRes.json()) as Telemetry[];
  return {
    revalidate: 1,
    props: {
      access_token,
      hydrometerId,
      startDate: formattedStartDate,
      data: telemetryData,
    },
  };
}
