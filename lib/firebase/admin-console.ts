import { doc, getDoc, setDoc, updateDoc, deleteField, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './config';
import { type Discovery } from './discoveries';

export interface AdminDiscoveryResult {
  success: boolean;
  message: string;
  discoveries?: Discovery[];
}

export async function getUserDiscoveries(uid: string): Promise<Discovery[]> {
  const docRef = doc(db, 'progress', uid);
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    return [];
  }
  
  const data = snap.data();
  return data.discoveries || [];
}

export async function getUserProgress(uid: string): Promise<{
  discoveries: Discovery[];
  totalDiscoveries: number;
  percentage: number;
} | null> {
  const docRef = doc(db, 'progress', uid);
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    return null;
  }
  
  const data = snap.data();
  const discoveries = data.discoveries || [];
  const totalDiscoveries = discoveries.length;
  const percentage = (totalDiscoveries / 28) * 100;
  
  return {
    discoveries,
    totalDiscoveries,
    percentage,
  };
}

export async function addDiscoveryToUser(
  uid: string,
  symbol: string,
  name: string,
  color?: string,
  type?: string
): Promise<AdminDiscoveryResult> {
  try {
    const currentDiscoveries = await getUserDiscoveries(uid);
    
    if (currentDiscoveries.some(d => d.symbol === symbol)) {
      return {
        success: false,
        message: `Element ${symbol} already discovered`,
      };
    }
    
    const newDiscovery: Discovery = {
      symbol,
      name,
      color: color || '#888888',
      type: type || 'synthetic',
      dateDiscovered: new Date().toISOString(),
    };
    
    const updatedDiscoveries = [...currentDiscoveries, newDiscovery];
    
    await setDoc(doc(db, 'progress', uid), {
      discoveries: updatedDiscoveries,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
    
    return {
      success: true,
      message: `Added ${symbol} (${name}) to user discoveries`,
      discoveries: updatedDiscoveries,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error adding discovery: ${error}`,
    };
  }
}

export async function removeDiscoveryFromUser(
  uid: string,
  symbol: string
): Promise<AdminDiscoveryResult> {
  try {
    const currentDiscoveries = await getUserDiscoveries(uid);
    
    const filteredDiscoveries = currentDiscoveries.filter(d => d.symbol !== symbol);
    
    if (filteredDiscoveries.length === currentDiscoveries.length) {
      return {
        success: false,
        message: `Element ${symbol} not found in discoveries`,
      };
    }
    
    await setDoc(doc(db, 'progress', uid), {
      discoveries: filteredDiscoveries,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
    
    return {
      success: true,
      message: `Removed ${symbol} from user discoveries`,
      discoveries: filteredDiscoveries,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error removing discovery: ${error}`,
    };
  }
}

export async function resetUserDiscoveries(uid: string): Promise<AdminDiscoveryResult> {
  try {
    await setDoc(doc(db, 'progress', uid), {
      discoveries: [],
      lastUpdated: new Date().toISOString(),
    });
    
    return {
      success: true,
      message: 'User discoveries reset successfully',
      discoveries: [],
    };
  } catch (error) {
    return {
      success: false,
      message: `Error resetting discoveries: ${error}`,
    };
  }
}

export async function setDiscoveryMilestone(
  uid: string,
  percentage: number
): Promise<AdminDiscoveryResult> {
  try {
    const targetCount = Math.round((percentage / 100) * 118);
    const currentDiscoveries = await getUserDiscoveries(uid);
    const currentCount = currentDiscoveries.length;
    
    let updatedDiscoveries = [...currentDiscoveries];
    
    if (targetCount > currentCount) {
      const elementsToAdd = targetCount - currentCount;
      const sampleElements = getSampleElements();
      
      for (let i = 0; i < elementsToAdd && i < sampleElements.length; i++) {
        const element = sampleElements[i];
        if (!updatedDiscoveries.some(d => d.symbol === element.symbol)) {
          updatedDiscoveries.push({
            symbol: element.symbol,
            name: element.name,
            color: element.color || '#888888',
            type: 'admin-added',
            dateDiscovered: new Date().toISOString(),
          });
        }
      }
    } else if (targetCount < currentCount) {
      updatedDiscoveries = updatedDiscoveries.slice(0, targetCount);
    }
    
    await setDoc(doc(db, 'progress', uid), {
      discoveries: updatedDiscoveries,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
    
    const newPercentage = (updatedDiscoveries.length / 28) * 100;
    
    return {
      success: true,
      message: `Set discovery milestone to ${percentage}% (${updatedDiscoveries.length}/28 elements)`,
      discoveries: updatedDiscoveries,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error setting milestone: ${error}`,
    };
  }
}

function getSampleElements() {
  return [
    { symbol: 'H', name: 'Hydrogen', color: '#FFFFFF' },
    { symbol: 'He', name: 'Helium', color: '#D9FFFF' },
    { symbol: 'Li', name: 'Lithium', color: '#CC80FF' },
    { symbol: 'Be', name: 'Beryllium', color: '#C2FF00' },
    { symbol: 'B', name: 'Boron', color: '#FFB5B5' },
    { symbol: 'C', name: 'Carbon', color: '#909090' },
    { symbol: 'N', name: 'Nitrogen', color: '#3050F8' },
    { symbol: 'O', name: 'Oxygen', color: '#FF0D0D' },
    { symbol: 'F', name: 'Fluorine', color: '#90E050' },
    { symbol: 'Ne', name: 'Neon', color: '#B3E3F5' },
    { symbol: 'Na', name: 'Sodium', color: '#AB5CF2' },
    { symbol: 'Mg', name: 'Magnesium', color: '#8AFF00' },
    { symbol: 'Al', name: 'Aluminium', color: '#BFA6A6' },
    { symbol: 'Si', name: 'Silicon', color: '#F0C8A0' },
    { symbol: 'P', name: 'Phosphorus', color: '#FF8000' },
    { symbol: 'S', name: 'Sulfur', color: '#FFFF30' },
    { symbol: 'Cl', name: 'Chlorine', color: '#1FF01F' },
    { symbol: 'Ar', name: 'Argon', color: '#80D1E3' },
    { symbol: 'K', name: 'Potassium', color: '#8F40D4' },
    { symbol: 'Ca', name: 'Calcium', color: '#3DFF00' },
  ];
}