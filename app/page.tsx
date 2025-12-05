"use client"

import React, { useState, useEffect } from 'react'
import { initializeApp } from 'firebase/app'
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  getDoc, 
  deleteDoc 
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAsuhQpozAApkknqUZAShXO6IrRQLnoHXI",
  authDomain: "dsm-play-6667b.firebaseapp.com",
  projectId: "dsm-play-6667b",
  storageBucket: "dsm-play-6667b.firebasestorage.app",
  messagingSenderId: "265498895416",
  appId: "1:265498895416:web:9f4912ffc3abb4098232cd",
  measurementId: "G-YH63FG2GTZ"
};

// Firebase 초기화
let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.log("Firebase demo mode");
}

const BOARD_POSITIONS = [
  { id: 0, name: '시작', type: 'start', color: '#10b981' },
  { id: 1, name: '서울', type: 'property', price: 1000, color: '#3b82f6' },
  { id: 2, name: '부산', type: 'property', price: 1200, color: '#3b82f6' },
  { id: 3, name: '찬스', type: 'chance', color: '#f59e0b' },
  { id: 4, name: '대구', type: 'property', price: 1400, color: '#8b5cf6' },
  { id: 5, name: '인천', type: 'property', price: 1600, color: '#8b5cf6' },
  { id: 6, name: '무인도', type: 'island', color: '#6b7280' },
  { id: 7, name: '광주', type: 'property', price: 1800, color: '#ec4899' },
  { id: 8, name: '대전', type: 'property', price: 2000, color: '#ec4899' },
  { id: 9, name: '찬스', type: 'chance', color: '#f59e0b' },
  { id: 10, name: '울산', type: 'property', price: 2200, color: '#ef4444' },
  { id: 11, name: '세종', type: 'property', price: 2400, color: '#ef4444' },
];

const BlueMarbleGame = () => {
  const [gameId, setGameId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [diceResult, setDiceResult] = useState(null);
  const [message, setMessage] = useState('');
  const [useFirebase, setUseFirebase] = useState(false);

  // 로컬 게임 상태 (Firebase 없이 테스트용)
  const [localGame, setLocalGame] = useState(null);

  useEffect(() => {
    if (!useFirebase || !gameId || !db) return;

    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        setGameState(doc.data());
      }
    });

    return () => unsubscribe();
  }, [gameId, useFirebase]);

  const createGame = async () => {
    if (!playerName.trim()) {
      setMessage('플레이어 이름을 입력하세요');
      return;
    }

    const newGameId = Math.random().toString(36).substring(7);
    const newPlayerId = Math.random().toString(36).substring(7);

    const initialGameState = {
      players: [{
        id: newPlayerId,
        name: playerName,
        position: 0,
        money: 20000,
        properties: []
      }],
      currentTurn: 0,
      properties: BOARD_POSITIONS.filter(p => p.type === 'property').map(p => ({
        id: p.id,
        owner: null,
        level: 0
      }))
    };

    if (useFirebase && db) {
      try {
        await setDoc(doc(db, 'games', newGameId), initialGameState);
        setGameId(newGameId);
        setPlayerId(newPlayerId);
        setIsHost(true);
        setMessage(`게임 생성됨! 코드: ${newGameId}`);
      } catch (error) {
        setMessage('Firebase 연결 실패. 로컬 모드로 전환합니다.');
        setUseFirebase(false);
        setLocalGame(initialGameState);
        setGameId(newGameId);
        setPlayerId(newPlayerId);
        setIsHost(true);
      }
    } else {
      setLocalGame(initialGameState);
      setGameId(newGameId);
      setPlayerId(newPlayerId);
      setIsHost(true);
      setMessage('로컬 게임 생성됨!');
    }
  };

  const joinGame = async () => {
    if (!playerName.trim() || !gameId.trim()) {
      setMessage('이름과 게임 코드를 입력하세요');
      return;
    }

    const newPlayerId = Math.random().toString(36).substring(7);

    if (useFirebase && db) {
      try {
        const gameRef = doc(db, 'games', gameId);
        const gameDoc = await getDoc(gameRef);

        if (gameDoc.exists()) {
          const game = gameDoc.data();
          game.players.push({
            id: newPlayerId,
            name: playerName,
            position: 0,
            money: 20000,
            properties: []
          });
          await updateDoc(gameRef, { players: game.players });
          setPlayerId(newPlayerId);
          setMessage('게임 참가 성공!');
        } else {
          setMessage('게임을 찾을 수 없습니다');
        }
      } catch (error) {
        setMessage('게임 참가 실패');
      }
    } else {
      setMessage('로컬 모드에서는 참가 기능이 제한됩니다');
    }
  };

  const rollDice = async () => {
    const currentState = useFirebase ? gameState : localGame;
    if (!currentState) return;

    const currentPlayer = currentState.players.find(p => p.id === playerId);
    const currentPlayerIndex = currentState.players.findIndex(p => p.id === playerId);

    if (currentPlayerIndex !== currentState.currentTurn) {
      setMessage('당신의 차례가 아닙니다');
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    setDiceResult(dice);

    const newPosition = (currentPlayer.position + dice) % BOARD_POSITIONS.length;
    const landedSpace = BOARD_POSITIONS[newPosition];

    let newMoney = currentPlayer.money;
    let msg = `${dice} 이동! ${landedSpace.name}에 도착`;

    if (newPosition < currentPlayer.position) {
      newMoney += 2000;
      msg += ' | 시작점 통과 +2000원';
    }

    if (landedSpace.type === 'property') {
      const property = currentState.properties.find(p => p.id === landedSpace.id);
      if (!property.owner) {
        if (newMoney >= landedSpace.price) {
          msg += ` | ${landedSpace.name} 구매 가능 (${landedSpace.price}원)`;
        }
      } else if (property.owner !== playerId) {
        const toll = landedSpace.price * 0.3;
        newMoney -= toll;
        msg += ` | 통행료 -${toll}원`;
      }
    }

    const updatedPlayers = [...currentState.players];
    updatedPlayers[currentPlayerIndex] = {
      ...currentPlayer,
      position: newPosition,
      money: newMoney
    };

    const nextTurn = (currentState.currentTurn + 1) % currentState.players.length;

    if (useFirebase && db) {
      await updateDoc(doc(db, 'games', gameId), {
        players: updatedPlayers,
        currentTurn: nextTurn
      });
    } else {
      setLocalGame({
        ...currentState,
        players: updatedPlayers,
        currentTurn: nextTurn
      });
    }

    setMessage(msg);
  };

  const buyProperty = async () => {
    const currentState = useFirebase ? gameState : localGame;
    if (!currentState) return;

    const currentPlayer = currentState.players.find(p => p.id === playerId);
    const landedSpace = BOARD_POSITIONS[currentPlayer.position];

    if (landedSpace.type !== 'property') {
      setMessage('부동산이 아닙니다');
      return;
    }

    const property = currentState.properties.find(p => p.id === landedSpace.id);
    if (property.owner) {
      setMessage('이미 소유자가 있습니다');
      return;
    }

    if (currentPlayer.money < landedSpace.price) {
      setMessage('돈이 부족합니다');
      return;
    }

    const updatedPlayers = currentState.players.map(p =>
      p.id === playerId
        ? { ...p, money: p.money - landedSpace.price, properties: [...p.properties, landedSpace.id] }
        : p
    );

    const updatedProperties = currentState.properties.map(p =>
      p.id === landedSpace.id ? { ...p, owner: playerId } : p
    );

    if (useFirebase && db) {
      await updateDoc(doc(db, 'games', gameId), {
        players: updatedPlayers,
        properties: updatedProperties
      });
    } else {
      setLocalGame({
        ...currentState,
        players: updatedPlayers,
        properties: updatedProperties
      });
    }

    setMessage(`${landedSpace.name} 구매 완료!`);
  };

  const currentState = useFirebase ? gameState : localGame;
  const currentPlayer = currentState?.players.find(p => p.id === playerId);
  const isMyTurn = currentState && currentState.players[currentState.currentTurn]?.id === playerId;

  if (!gameId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center mb-6 text-gray-800">🎲 부루마블</h1>
          
          <div className="mb-6">
            <label className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                checked={useFirebase}
                onChange={(e) => setUseFirebase(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-600">Firebase 사용 (실제 멀티플레이어)</span>
            </label>
            <p className="text-xs text-gray-500 mb-4">
              {useFirebase ? '⚠️ Firebase 설정 필요. 데모 키는 작동하지 않습니다.' : '✓ 로컬 모드로 테스트 가능'}
            </p>
          </div>

          <input
            type="text"
            placeholder="플레이어 이름"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 focus:border-blue-500 outline-none"
          />

          <button
            onClick={createGame}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-bold mb-4 hover:bg-blue-600 transition"
          >
            새 게임 만들기
          </button>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="게임 코드"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none"
            />
            <button
              onClick={joinGame}
              className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition"
            >
              참가
            </button>
          </div>

          {message && (
            <div className="mt-4 p-3 bg-blue-100 text-blue-800 rounded-lg text-sm">
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">🎲 부루마블</h1>
            <div className="text-sm text-gray-600">
              게임 코드: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{gameId}</span>
              {!useFirebase && <span className="ml-2 text-orange-600">(로컬 모드)</span>}
            </div>
          </div>

          {message && (
            <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg text-sm">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-6 gap-2 mb-4">
                {BOARD_POSITIONS.map((space) => {
                  const playersHere = currentState?.players.filter(p => p.position === space.id) || [];
                  const property = currentState?.properties.find(p => p.id === space.id);
                  const owner = property?.owner ? currentState.players.find(p => p.id === property.owner) : null;

                  return (
                    <div
                      key={space.id}
                      className="aspect-square rounded-lg p-2 flex flex-col justify-between text-xs relative"
                      style={{ backgroundColor: space.color }}
                    >
                      <div className="text-white font-bold">{space.name}</div>
                      {space.price && (
                        <div className="text-white text-xs">{space.price}원</div>
                      )}
                      {owner && (
                        <div className="text-white text-xs bg-black bg-opacity-30 px-1 rounded">
                          {owner.name}
                        </div>
                      )}
                      {playersHere.length > 0 && (
                        <div className="absolute bottom-1 right-1 flex gap-1">
                          {playersHere.map((p, i) => (
                            <div
                              key={i}
                              className="w-3 h-3 rounded-full bg-yellow-400 border-2 border-white"
                              title={p.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {diceResult && (
                <div className="text-center mb-4">
                  <div className="inline-block bg-white rounded-lg shadow-lg p-4">
                    <div className="text-6xl">🎲</div>
                    <div className="text-3xl font-bold text-gray-800 mt-2">{diceResult}</div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={rollDice}
                  disabled={!isMyTurn}
                  className={`px-6 py-3 rounded-lg font-bold transition ${
                    isMyTurn
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  주사위 굴리기
                </button>
                <button
                  onClick={buyProperty}
                  disabled={!isMyTurn}
                  className={`px-6 py-3 rounded-lg font-bold transition ${
                    isMyTurn
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  부동산 구매
                </button>
              </div>
            </div>

            <div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-lg mb-3 text-gray-800">내 정보</h3>
                {currentPlayer && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">이름:</span>
                      <span className="font-bold">{currentPlayer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">위치:</span>
                      <span className="font-bold">{BOARD_POSITIONS[currentPlayer.position].name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">보유금:</span>
                      <span className="font-bold text-green-600">{currentPlayer.money}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">부동산:</span>
                      <span className="font-bold">{currentPlayer.properties.length}개</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-3 text-gray-800">플레이어 목록</h3>
                <div className="space-y-2">
                  {currentState?.players.map((player, index) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg ${
                        index === currentState.currentTurn
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-white'
                      }`}
                    >
                      <div className="font-bold">{player.name}</div>
                      <div className="text-sm text-gray-600">{player.money}원</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlueMarbleGame;