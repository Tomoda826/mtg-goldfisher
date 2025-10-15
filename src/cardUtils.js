// Card Utilities - helper functions for card database and categorization

import Papa from 'papaparse';

// Load card database from CSV
export const loadCardDatabase = async (setLoadingStatus) => {
  try {
    setLoadingStatus('Loading card database...');
    
    // Try to fetch from public folder
    let response = await fetch('/data/Full card data.csv');
    
    if (!response.ok) {
      response = await fetch('/Full card data.csv');
    }
    
    if (!response.ok) {
      throw new Error(`CSV file not found. Status: ${response.status}`);
    }
    
    const csvData = await response.text();
    
    // Use PapaParse to parse CSV
    const parsed = Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
    
    // Create a map for fast lookups (by lowercase name)
    const cardMap = {};
    parsed.data.forEach(card => {
      if (card.name) {
        const key = card.name.toLowerCase().trim();
        // Keep only the first occurrence of each card name
        if (!cardMap[key]) {
          cardMap[key] = {
            name: card.name,
            type: card.type || '',
            types: card.types || '',
            manaCost: card.manaCost || '',
            manaValue: card.manaValue || 0,
            power: card.power || '',
            toughness: card.toughness || '',
            text: card.text || '',
            subtypes: card.subtypes || '',
            supertypes: card.supertypes || '',
            rarity: card.rarity || '',
            loyalty: card.loyalty || '',
            keywords: card.keywords || '',
          };
        }
      }
    });
    
    console.log(`✅ Successfully loaded ${Object.keys(cardMap).length} cards into database`);
    return cardMap;
  } catch (error) {
    console.error('❌ Error loading card database:', error);
    throw error;
  }
};

// Look up card from database
export const lookupCard = (cardDatabase, cardName) => {
  if (!cardDatabase) return null;
  const key = cardName.toLowerCase().trim();
  return cardDatabase[key] || null;
};

// Categorize card based on type line
export const categorizeCard = (type) => {
  if (!type) return 'unknown';
  
  const lower = type.toLowerCase();
  
  // Check for multiple types (e.g., "Artifact Creature")
  if (lower.includes('creature')) return 'creature';
  if (lower.includes('land')) return 'land';
  if (lower.includes('artifact')) return 'artifact';
  if (lower.includes('enchantment')) return 'enchantment';
  if (lower.includes('planeswalker')) return 'planeswalker';
  if (lower.includes('instant')) return 'instant';
  if (lower.includes('sorcery')) return 'sorcery';
  
  return 'unknown';
};

// Parse deck list using card database
export const parseDeckList = async (cardDatabase, commanderText, deckText) => {
  if (!cardDatabase) {
    throw new Error('Card database is not loaded');
  }
  
  const deck = {
    commanders: [],
    creatures: [],
    instants: [],
    sorceries: [],
    artifacts: [],
    enchantments: [],
    planeswalkers: [],
    lands: [],
    unknown: [],
    totalCommanders: 0,
    totalDeck: 0,
    total: 0
  };

  const processLine = (line, isCommander) => {
    const match = line.match(/^(\d+)x?\s+(.+)$/);
    const cardName = match ? match[2].trim() : line.trim();
    const quantity = match ? parseInt(match[1]) : 1;
    
    const cardData = lookupCard(cardDatabase, cardName);
    
    if (cardData) {
      const category = categorizeCard(cardData.type);
      return {
        name: cardData.name,
        type_line: cardData.type,
        mana_cost: cardData.manaCost,
        cmc: cardData.manaValue,
        power: cardData.power,
        toughness: cardData.toughness,
        oracle_text: cardData.text,
        quantity: quantity,
        category: category,
        isCommander: isCommander
      };
    } else {
      return {
        name: cardName,
        quantity: quantity,
        category: 'unknown',
        type_line: 'Not Found in Database',
        isCommander: isCommander
      };
    }
  };
  
  // Process commanders
  if (commanderText.trim()) {
    const commanderLines = commanderText.split('\n').filter(line => line.trim());
    commanderLines.forEach(line => {
      const card = processLine(line, true);
      deck.commanders.push(card);
      deck.totalCommanders += card.quantity;
    });
  }
  
  // Process main deck
  if (deckText.trim()) {
    const deckLines = deckText.split('\n').filter(line => line.trim());
    deckLines.forEach(line => {
      const card = processLine(line, false);
      
      switch (card.category) {
        case 'creature':
          deck.creatures.push(card);
          break;
        case 'instant':
          deck.instants.push(card);
          break;
        case 'sorcery':
          deck.sorceries.push(card);
          break;
        case 'artifact':
          deck.artifacts.push(card);
          break;
        case 'enchantment':
          deck.enchantments.push(card);
          break;
        case 'planeswalker':
          deck.planeswalkers.push(card);
          break;
        case 'land':
          deck.lands.push(card);
          break;
        default:
          deck.unknown.push(card);
      }
      deck.totalDeck += card.quantity;
    });
  }

  deck.total = deck.totalCommanders + deck.totalDeck;
  
  return deck;
};