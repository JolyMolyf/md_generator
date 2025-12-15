import { parentPort, workerData } from 'worker_threads';

interface Instrument {
  id: string;
  symbol: string;
  spotPrice: number;
  mktBid: number;
  mktAsk: number;
  delta: number;
  premium: number;
}

interface MarketUpdate {
  instrumentId: string;
  symbol: string;
  spotPrice: number;
  mktBid: number;
  mktAsk: number;
  delta: number;
  premium: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

const instrumentState = new Map<string, {
  spotPrice: number;
  mktBid: number;
  mktAsk: number;
  delta: number;
  premium: number;
}>();

const VOLATILITY = 0.02; 
const SPREAD_PERCENT = 0.01; 


function initializeInstruments(instruments: Instrument[]) {
  instruments.forEach((inst) => {
    const currentSpot = inst.spotPrice || 100;
    const spread = currentSpot * SPREAD_PERCENT;
    
    instrumentState.set(inst.id, {
      spotPrice: currentSpot,
      mktBid: inst.mktBid || currentSpot - spread / 2,
      mktAsk: inst.mktAsk || currentSpot + spread / 2,
      delta: inst.delta || 0.5,
      premium: inst.premium || 0,
    });
  });
}

function nextPrice(currentPrice: number): number {
  const change = (Math.random() - 0.5) * 2 * VOLATILITY * currentPrice;
  const newPrice = Math.max(0.01, currentPrice + change);
  return Number(newPrice.toFixed(2));
}

function generateUpdate(instrument: Instrument): MarketUpdate {
  const state = instrumentState.get(instrument.id);
  if (!state) {

    const currentSpot = instrument.spotPrice || 100;
    instrumentState.set(instrument.id, {
      spotPrice: currentSpot,
      mktBid: currentSpot * 0.9995,
      mktAsk: currentSpot * 1.0005,
      delta: instrument.delta || 0.5,
      premium: instrument.premium || 0,
    });
    return generateUpdate(instrument);
  }

  const oldSpotPrice = state.spotPrice;
  const newSpotPrice = nextPrice(oldSpotPrice);
  const change = newSpotPrice - oldSpotPrice;
  const changePercent = (change / oldSpotPrice) * 100;
  
  const spread = newSpotPrice * SPREAD_PERCENT;
  const newBid = Number((newSpotPrice - spread / 2).toFixed(2));
  const newAsk = Number((newSpotPrice + spread / 2).toFixed(2));
  
  const newDelta = Number((0.3 + Math.random() * 0.4).toFixed(2)); 
  const newPremium = Number((Math.abs(change) * 0.1 + Math.random() * 0.5).toFixed(2));
  
  instrumentState.set(instrument.id, {
    spotPrice: newSpotPrice,
    mktBid: newBid,
    mktAsk: newAsk,
    delta: newDelta,
    premium: newPremium,
  });

  return {
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    spotPrice: newSpotPrice,
    mktBid: newBid,
    mktAsk: newAsk,
    delta: newDelta,
    premium: newPremium,
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    timestamp: new Date().toISOString(),
  };
}

function startSimulation(instruments: Instrument[], interval: number) {
  initializeInstruments(instruments);
  // console.log('Simulation started, instruments initialized', instrumentState);
  
  const intervalId = setInterval(() => {
    const updates = instruments.map((inst) => generateUpdate(inst));

    if (parentPort) {
      parentPort.postMessage({
        type: 'market-updates',
        updates,
        timestamp: new Date().toISOString(),
      });
    }
  }, interval);

  if (parentPort) {
    (parentPort as any).intervalId = intervalId;
  }
}

function stopSimulation() {
  if (parentPort && (parentPort as any).intervalId) {
    clearInterval((parentPort as any).intervalId);
    (parentPort as any).intervalId = null;
  }
}

if (parentPort) {
  parentPort.on('message', (message) => {
    if (message.type === 'start') {
      startSimulation(message.instruments, message.interval || 500);
    } else if (message.type === 'update-instruments') {
      initializeInstruments(message.instruments);
    } else if (message.type === 'stop') {
      stopSimulation();
    }
  });

  parentPort.postMessage({ type: 'ready' });
}
