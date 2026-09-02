import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.get("/", (req, res) => {
  res.json({
    status: "online",
    sistema: "Diagnóstico Inteligente da Lavoura - C.DANIEL_AGRO",
    ia: "Gemini"
  });
});

app.post("/analisar-planta", upload.single("imagem"), async (req, res) => {
  try {
    const {
      cultura = "Não informada",
      parte_planta = "Não informada",
      descricao = "Não informada"
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        erro: "Nenhuma imagem foi enviada."
      });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        erro: "O arquivo enviado precisa ser uma imagem."
      });
    }

    const imagemBase64 = req.file.buffer.toString("base64");

    const prompt = `
Você atua como sistema de TRIAGEM VISUAL AGRÍCOLA.

Analise cuidadosamente a fotografia enviada.

INFORMAÇÕES DO PRODUTOR:

Cultura: ${cultura}
Parte da planta: ${parte_planta}
Descrição do produtor: ${descricao}

Analise sinais visualmente compatíveis com:
- doenças;
- pragas;
- deficiências nutricionais;
- fitotoxicidade;
- estresse hídrico;
- problemas fisiológicos;
- danos ambientais;
- danos mecânicos;
- outros sintomas agrícolas visíveis.

REGRAS IMPORTANTES:

1. Esta é uma análise preliminar por imagem.
2. Não trate hipótese visual como diagnóstico confirmado.
3. Não invente sintomas que não estejam visíveis.
4. Considere diagnósticos diferenciais.
5. Se a fotografia não permitir análise adequada, informe isso.
6. Não recomende doses de defensivos.
7. Não prescreva defensivos somente pela fotografia.
8. A confiança representa somente a confiança na hipótese visual.
9. Quando necessário, recomende avaliação técnica presencial.

Retorne SOMENTE JSON válido no seguinte formato:

{
  "possivel_problema": "texto",
  "confianca": 0,
  "possiveis_causas": ["texto"],
  "o_que_observar": ["texto"],
  "orientacao_inicial": "texto",
  "outras_hipoteses": ["texto"]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            },
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: imagemBase64
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const texto = response.text.trim();

    let resultado;

    try {
      resultado = JSON.parse(texto);
    } catch (erroJSON) {
      console.error("RESPOSTA GEMINI:", texto);

      return res.status(500).json({
        erro: "A IA respondeu em um formato inesperado."
      });
    }

    return res.json(resultado);

  } catch (error) {
    console.error("ERRO GEMINI:", error);

    return res.status(500).json({
      erro: "Não foi possível analisar a imagem."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor funcionando na porta ${PORT}`);
});
