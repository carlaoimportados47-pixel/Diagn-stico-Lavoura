import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Teste para saber se o servidor está funcionando
app.get("/", (req, res) => {
  res.json({
    status: "online",
    sistema: "Diagnóstico Inteligente da Lavoura - C.DANIEL_AGRO"
  });
});

// Rota que recebe a foto
app.post(
  "/analisar-planta",
  upload.single("imagem"),
  async (req, res) => {
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

      const base64 = req.file.buffer.toString("base64");

      const imagem = `data:${req.file.mimetype};base64,${base64}`;

      const prompt = `
Você atua como sistema de TRIAGEM VISUAL AGRÍCOLA.

Analise cuidadosamente a fotografia enviada.

INFORMAÇÕES DO PRODUTOR:

Cultura: ${cultura}
Parte da planta: ${parte_planta}
Descrição: ${descricao}

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

REGRAS:

1. A análise é preliminar.
2. Não trate uma hipótese visual como diagnóstico confirmado.
3. Não invente sintomas que não estejam visíveis.
4. Considere diagnósticos diferenciais.
5. Se a imagem estiver ruim ou insuficiente, informe isso.
6. Não recomende doses de defensivos.
7. Não prescreva defensivos com base somente na fotografia.
8. A confiança deve representar apenas a confiança na hipótese visual.
9. Quando necessário, recomende avaliação técnica presencial.

Responda SOMENTE em JSON válido neste formato:

{
  "possivel_problema": "texto",
  "confianca": 0,
  "possiveis_causas": ["texto"],
  "o_que_observar": ["texto"],
  "orientacao_inicial": "texto",
  "outras_hipoteses": ["texto"]
}
`;

      const response = await openai.responses.create({
        model: "gpt-5.4-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt
              },
              {
                type: "input_image",
                image_url: imagem,
                detail: "high"
              }
            ]
          }
        ]
      });

      let texto = response.output_text.trim();

      texto = texto
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      let resultado;

      try {
        resultado = JSON.parse(texto);
      } catch {
        console.error("Resposta recebida:", texto);

        return res.status(500).json({
          erro: "A IA respondeu em um formato inesperado."
        });
      }

      return res.json(resultado);

    } catch (error) {
      console.error("ERRO:", error);

      return res.status(500).json({
        erro: "Não foi possível analisar a imagem."
      });
    }
  }
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor funcionando na porta ${PORT}`);
});
