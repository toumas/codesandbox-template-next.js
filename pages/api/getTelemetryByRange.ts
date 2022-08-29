import type {NextApiRequest, NextApiResponse} from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const telemetryRes = await fetch(
      `https://api.rapt.io/api/Hydrometers/GetTelemetry?hydrometerId=${req.query.hydrometerId}&startDate=${req.query.startDate}&endDate=${req.query.endDate}`,
      {
        headers: {
          Authorization: `Bearer ${req.query.token}`,
        },
      },
    );
    console.log(telemetryRes)
    if (telemetryRes.status === 429) {
        res.status(telemetryRes.status).json({message: "API limit reached, try again in 5 minutes"})
    }
    res.status(200).json(await telemetryRes.json());
  } catch (error) {
    res.status(500).json(JSON.stringify(error, null, 4));
  }
}
