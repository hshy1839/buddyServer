const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bodyParser = require('body-parser');
const connection = require('./db');

const app = express();
const port = 3000;

app.use(cookieParser());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'mySecretKey',
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

connection.connect((err) => {
    if (err) {
        console.error('DB 연결 실패: ' + err.stack);
        return;
    }
    console.log('DB 연결 성공');
});

app.use(cors({
    origin: 'http://3.37.54.62',
    methods: ['GET', 'POST'],
    credentials: true,
    optionsSuccessStatus: 200,
}));

app.use(bodyParser.json());

app.post('/api/buddy/login', (req, res) => {
    const { username, password } = req.body;

    const query = `SELECT * FROM members WHERE username = ? AND password = ?`;

    connection.query(query, [username, password], (err, result) => {
        if (err) {
            console.error('로그인 실패: ' + err.stack);
            res.status(500).send('로그인 실패');
            return;
        }
        if (result.length === 0) {
            res.status(401).send('아이디 또는 비밀번호가 올바르지 않습니다.');
            return;
        }
        const user = result[0];
        if (user.is_active !== 1) {
            res.status(401).send('비활성화된 계정입니다');
            return;
        }
        req.session.userId = user.id;

        console.log('세션에 저장된 기본키:', req.session.userId);

        res.status(200).json(user);
    });
});

function generateRandomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }


app.post('/api/buddy/signup', (req, res) => {
    const { username, password, email, name, birthdate, phoneNumber } = req.body;
  
    
    function generateUniqueHashcode(callback) {
      let hashcode = generateRandomCode();
  
      connection.query('SELECT * FROM members WHERE hashcode = ?', [hashcode], (err, result) => {
        if (err) {
          console.error('해시코드 중복 검사 실패: ' + err.stack);
          res.status(500).send('회원가입 실패');
          return;
        }
        if (result.length > 0) {
          // 해시코드가 중복되면 다시 생성
          generateUniqueHashcode(callback);
        } else {
          // 중복되지 않는 해시코드가 생성되면 콜백 함수 호출
          callback(hashcode);
        }
      });
    }
  
    generateUniqueHashcode((hashcode) => {
      const query = `INSERT INTO members (username, password, email, name, birthdate, phoneNumber, is_active, hashcode) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`;
  
      connection.query(query, [username, password, email, name, birthdate, phoneNumber, hashcode], (err, result) => {
        if (err) {
          console.error('회원가입 실패: ' + err.stack);
          res.status(500).send('회원가입 실패');
          return;
        }
        console.log('회원가입 성공');
        res.status(200).send('회원가입 성공');
      });
    });
  });

app.post('/api/buddy/score/surveyscore', (req, res) => {
    const surveyScore = req.body.surveyScore;
    const userId = req.session.userId;

    // 사용자의 surveyScore 값이 이미 있는지 확인하는 쿼리
    const selectScoreQuery = "SELECT surveyScore FROM score WHERE user_id = ?;";

    connection.query(selectScoreQuery, [userId], (selectErr, selectResult) => {
        if (selectErr) {
            console.error('검사점수 조회 실패: ' + selectErr.stack);
            res.status(500).send('검사점수 조회 실패');
            return;
        }

        // 사용자의 surveyScore 값이 이미 존재하는 경우 업데이트
        if (selectResult.length > 0) {
            const updateScoreQuery = "UPDATE score SET surveyScore = ? WHERE user_id = ?;";

            connection.query(updateScoreQuery, [surveyScore, userId], (updateErr, updateResult) => {
                if (updateErr) {
                    console.error('검사점수 업데이트 실패: ' + updateErr.stack);
                    res.status(500).send('검사점수 업데이트 실패');
                    return;
                }
                res.status(200).send('검사점수 업데이트 성공');
            });
        } else {
            // 사용자의 surveyScore 값이 없는 경우 새로운 레코드 추가
            const insertScoreQuery = "INSERT INTO score (surveyScore, user_id) VALUES (?, ?);";

            connection.query(insertScoreQuery, [surveyScore, userId], (insertErr, insertResult) => {
                if (insertErr) {
                    console.error('검사점수 추가 실패: ' + insertErr.stack);
                    res.status(500).send('검사점수 추가 실패');
                    return;
                }
                res.status(200).send('검사점수 추가 성공');
            });
        }
    });
});

app.post('/api/buddy/score/sentiment', (req, res) => {
    const sentiment = req.body.sentiment;
    const userId = req.session.userId;

    // 사용자의 surveyScore 값이 이미 있는지 확인하는 쿼리
    const selectScoreQuery = "SELECT sentiment FROM score WHERE user_id = ?;";

    connection.query(selectScoreQuery, [userId], (selectErr, selectResult) => {
        if (selectErr) {
            console.error('검사점수 조회 실패: ' + selectErr.stack);
            res.status(500).send('검사점수 조회 실패');
            return;
        }

        // 사용자의 surveyScore 값이 이미 존재하는 경우 업데이트
        if (selectResult.length > 0) {
            const updateScoreQuery = "UPDATE score SET sentiment = ? WHERE user_id = ?;";

            connection.query(updateScoreQuery, [sentiment, userId], (updateErr, updateResult) => {
                if (updateErr) {
                    console.error('검사점수 업데이트 실패: ' + updateErr.stack);
                    res.status(500).send('검사점수 업데이트 실패');
                    return;
                }
                res.status(200).send('검사점수 업데이트 성공');
            });
        } else {
            // 사용자의 surveyScore 값이 없는 경우 새로운 레코드 추가
            const insertScoreQuery = "INSERT INTO score (sentiment, user_id) VALUES (?, ?);";

            connection.query(insertScoreQuery, [sentiment, userId], (insertErr, insertResult) => {
                if (insertErr) {
                    console.error('검사점수 추가 실패: ' + insertErr.stack);
                    res.status(500).send('검사점수 추가 실패');
                    return;
                }
                res.status(200).send('검사점수 추가 성공');
            });
        }
    });
});

app.post('/api/buddy/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('세션 삭제 실패:', err);
            res.status(500).send('세션 삭제 실패');
            return;
        }
        console.log('세션 삭제 완료');
        res.status(200).send('로그아웃 성공');
    });
});

//우울증 조사 검사 결과
app.get('/api/buddy/score/getsurveyscore', (req, res) => {
    // 쿠키에서 사용자 ID를 추출합니다.
    const userId = req.session.userId;
    if (!userId) {
        console.error('사용자 ID가 세션에 없습니다.');
        res.status(401).json({ error: '사용자 ID가 세션에 없습니다.' });
        return;
    }
    // 사용자 ID를 사용하여 데이터베이스에서 사용자 정보를 가져옵니다.
    connection.query(
        "SELECT surveyScore FROM score WHERE user_id = ?;",
        [userId], // userId 값을 플레이스홀더에 전달
        (err, rows, fields) => {
            if (err) {
                console.error('회원 정보 조회 실패: ' + err.stack);
                res.status(500).json({ error: '회원 정보 조회 실패' }); // JSON 형식으로 오류 응답
                return;
            }

            if (rows.length === 0) {
                console.error('사용자 정보가 없습니다.');
                res.status(404).json({ error: '사용자 정보가 없습니다.' }); // JSON 형식으로 오류 응답
                return;
            }

            // 조회된 사용자 정보를 JSON 형식으로 응답
            const user = rows[0];
            const surveyScore = {
                surveyScore : user.surveyScore,
            };
            res.status(200).json(surveyScore); // JSON 형식으로 사용자 정보 응답
        }
    );
});

//감정일기 분석결과
app.get('/api/buddy/score/getsentiment', (req, res) => {
    // 쿠키에서 사용자 ID를 추출합니다.
    const userId = req.session.userId;
    if (!userId) {
        console.error('사용자 ID가 세션에 없습니다.');
        res.status(401).json({ error: '사용자 ID가 세션에 없습니다.' });
        return;
    }
    // 사용자 ID를 사용하여 데이터베이스에서 사용자 정보를 가져옵니다.
    connection.query(
        "SELECT sentiment FROM score WHERE user_id = ?;",
        [userId], // userId 값을 플레이스홀더에 전달
        (err, rows, fields) => {
            if (err) {
                console.error('회원 정보 조회 실패: ' + err.stack);
                res.status(500).json({ error: '회원 정보 조회 실패' }); // JSON 형식으로 오류 응답
                return;
            }

            if (rows.length === 0) {
                console.error('사용자 정보가 없습니다.');
                res.status(404).json({ error: '사용자 정보가 없습니다.' }); // JSON 형식으로 오류 응답
                return;
            }

            // 조회된 사용자 정보를 JSON 형식으로 응답
            const user = rows[0];
            const sentiment = {
                sentiment : user.sentiment,
            };
            res.status(200).json(sentiment); // JSON 형식으로 사용자 정보 응답
        }
    );
});

app.get('/api/buddy/userinfo', (req, res) => {
    // 쿠키에서 사용자 ID를 추출합니다.
    const userId = req.session.userId;
    if (!userId) {
        console.error('사용자 ID가 세션에 없습니다.');
        res.status(401).json({ error: '사용자 ID가 세션에 없습니다.' });
        return;
    }
    // 사용자 ID를 사용하여 데이터베이스에서 사용자 정보를 가져옵니다.
    connection.query(
        "SELECT username, email, password, name, birthdate, phoneNumber FROM members WHERE id = ?;",
        [userId], // userId 값을 플레이스홀더에 전달
        (err, rows, fields) => {
            if (err) {
                console.error('회원 정보 조회 실패: ' + err.stack);
                res.status(500).json({ error: '회원 정보 조회 실패' }); // JSON 형식으로 오류 응답
                return;
            }

            if (rows.length === 0) {
                console.error('사용자 정보가 없습니다.');
                res.status(404).json({ error: '사용자 정보가 없습니다.' }); // JSON 형식으로 오류 응답
                return;
            }

            // 조회된 사용자 정보를 JSON 형식으로 응답
            const user = rows[0];
            const userInfo = {
                username: user.username,
                email: user.email,
                password: user.password,
                birthdate: user.birthdate,
                name: user.name,
                phoneNumber: user.phoneNumber,
            };
            res.status(200).json(userInfo); // JSON 형식으로 사용자 정보 응답
        }
    );
});

app.post('/api/buddy/board', (req, res) => {
    const { title, content } = req.body;
    const userId = req.session.userId;

    if (!title || !content || !userId) {
        res.status(400).json({ success: false, message: '제목, 내용 또는 사용자 ID가 누락되었습니다.' });
        return;
    }

    const insertBoardQuery = "INSERT INTO mobile_boards (title, content, user_id) VALUES (?, ?, ?)";

    connection.query(insertBoardQuery, [title, content, userId], (insertErr, insertResult) => {
        if (insertErr) {
            console.error('게시판 추가 실패: ' + insertErr.stack);
            res.status(500).json({ success: false, message: '게시판 추가 실패' });
            return;
        }
        res.status(200).json({ success: true, message: '게시판 추가 성공' });
    });
});

//게시판 조회
app.get('/api/buddy/getboard', (req, res) => {
    // 사용자 ID를 사용하지 않고 모든 게시물의 제목과 내용을 가져옵니다.
    connection.query(
        "SELECT b.title, b.content, b.created_at, m.username FROM mobile_boards b JOIN members m ON b.user_id = m.id ORDER BY b.post_id;",
        (err, rows, fields) => {
            if (err) {
                console.error('게시물 조회 실패: ' + err.stack);
                res.status(500).json({ error: '게시물 조회 실패' }); // JSON 형식으로 오류 응답
                return;
            }

            if (rows.length === 0) {
                console.error('게시물이 없습니다.');
                res.status(404).json({ error: '게시물이 없습니다.' }); // JSON 형식으로 오류 응답
                return;
            }

            // 조회된 모든 게시물 정보를 JSON 형식으로 응답
            res.status(200).json(rows); // JSON 형식으로 모든 게시물 정보 응답
        }
    );
});




app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
