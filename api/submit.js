import axios from 'axios/dist/node/axios.cjs';

export default async function handler(req, res) {

    try {

        // Handle CORS if your frontend is hosted on a different domain
        res.setHeader('Access-Control-Allow-Origin', '*'); // Replace '*' with your frontend domain if needed
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { telefono, asistencia } = req.body;

        // Validate input
        if (!telefono || !asistencia) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Regular expression to validate phone number format
        const phoneRegex = /^\+\d{1,4}\d{7,15}$/;

        if (!phoneRegex.test(telefono.trim())) {
            return res.status(400).json({
                success: false,
                message:
                    'Número de teléfono inválido. Asegúrate de incluir el código de país, ejemplo: +1234567890',
            });
        }

        // Access environment variables
        const NOTION_TOKEN = process.env.NOTION_TOKEN;
        const DATABASE_ID = process.env.DATABASE_ID;

        try {
            // Query the Notion database for a matching "Teléfono de Contacto"
            const queryResponse = await axios.post(
                `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
                {
                    filter: {
                        property: 'Teléfono de contacto',
                        phone_number: {
                            equals: telefono,
                        },
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${NOTION_TOKEN}`,
                        'Content-Type': 'application/json',
                        'Notion-Version': '2022-06-28',
                    },
                }
            );

            const results = queryResponse.data.results;

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontró ninguna entrada con ese número de teléfono',
                });
            }

            const pageId = results[0].id;
            const confirmValue = asistencia.toLowerCase() === 'si';

            // Update the "Confirmado" field in Notion
            await axios.patch(
                `https://api.notion.com/v1/pages/${pageId}`,
                {
                    properties: {
                        Confirmado: {
                            checkbox: confirmValue,
                        },
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${NOTION_TOKEN}`,
                        'Content-Type': 'application/json',
                        'Notion-Version': '2022-06-28',
                    },
                }
            );

            res.status(200).json({
                success: true,
                message: 'Asistencia confirmada correctamente',
            });
        } catch (error) {
            console.error(error.response ? error.response.data : error.message);
            res.status(500).json({
                success: false,
                message: 'Error al procesar la solicitud',
                error: error.message,
            });
        }

    } catch (error) {
        console.error('Error in API function:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }

}
