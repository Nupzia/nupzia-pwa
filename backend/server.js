const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import cors
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.DATABASE_ID;

app.post('/submit', async (req, res) => {
    const { telefono, asistencia } = req.body;

    // Regular expression to validate phone number format
    const phoneRegex = /^\+\d{1,4}\d{7,15}$/;

    if (!phoneRegex.test(telefono)) {
        return res.status(400).send({
            success: false,
            message: "Número de teléfono inválido. Asegúrate de incluir el código de país, ejemplo: +1234567890",
        });
    }

    try {
        // Query the Notion database for a matching "Teléfono de Contacto"
        const queryResponse = await axios.post(
            `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
            {
                filter: {
                    property: "Teléfono de contacto",
                    phone_number: {
                        equals: telefono, // Match the provided phone number
                    },
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${NOTION_TOKEN}`,
                    "Content-Type": "application/json",
                    "Notion-Version": "2022-06-28",
                },
            }
        );

        const results = queryResponse.data.results;
        if (results.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No se encontró ninguna entrada con ese número de teléfono",
            });
        }

        const pageId = results[0].id;
        const confirmValue = asistencia.toLowerCase() === "si";

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
                    "Content-Type": "application/json",
                    "Notion-Version": "2022-06-28",
                },
            }
        );

        res.status(200).send({ success: true });
    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
        res.status(500).send({
            success: false,
            message: "Error al procesar la solicitud",
            error: error.message,
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
