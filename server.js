const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 5000;

// ✅ CORS 허용
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // 모든 도메인 허용
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// ✅ 환경변수에서 MongoDB 연결 정보 불러오기
const dbUri = process.env.DB_URI;
mongoose.connect(dbUri);

// ✅ 꽃 스키마 및 모델 정의
const flowerSchema = new mongoose.Schema({
  flowername: String,
  habitat: String,
  binomialName: String,
  classification: String,
  flowername_kr: String
});

const Flower = mongoose.model('Flower', flowerSchema, 'flowers');

// ✅ 꽃 정보 조회 API
app.get('/flowers', async (req, res) => {
  const flowername = req.query.flowername;

  try {
    const flower = await Flower.findOne({
      $or: [
        { flowername: flowername },
        { flowername_kr: flowername }
      ]
    });

    if (!flower) {
      return res.status(404).json({ error: 'Flower not found' });
    }

    const { flowername, habitat, binomialName, classification, flowername_kr } = flower;
    res.json({ flowername, habitat, binomialName, classification, flowername_kr });
  } catch (error) {
    console.error('Error retrieving flower information:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// ✅ 네이버 쇼핑 검색 리디렉션 API (버튼 클릭용)
app.get('/naver-shopping', (req, res) => {
  const keyword = req.query.flowername;
  if (!keyword) {
    return res.status(400).send('Missing flowername');
  }

  const encoded = encodeURIComponent(keyword);
  const redirectUrl = `https://search.shopping.naver.com/search/all?query=${encoded}`;
  res.redirect(redirectUrl);
});

// ✅ 네이버 쇼핑 API → JSON 응답 (카드 렌더링용)
app.get('/naver-shopping-api', async (req, res) => {
  const flowername = req.query.flowername;

  if (!flowername) {
    return res.status(400).json({ error: 'Flowername is required' });
  }

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const displayPerPage = 100;
  const maxResults = 1000;

  let start = 1;
  const allResults = [];

  try {
    while (start <= maxResults) {
      const apiUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(flowername)}&display=${displayPerPage}&start=${start}&sort=sim`;

      const response = await axios.get(apiUrl, {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      });

      const items = response.data.items || [];
      if (items.length === 0) break;

      allResults.push(...items);
      start += displayPerPage;
    }

    console.log(`총 ${allResults.length}개의 검색 결과를 가져왔습니다.`);
    res.json({ items: allResults });

  } catch (error) {
    console.error('네이버 쇼핑 API 오류:', error);
    res.status(500).json({ error: 'Naver Shopping API error' });
  }
});

// ✅ 서버 실행
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});