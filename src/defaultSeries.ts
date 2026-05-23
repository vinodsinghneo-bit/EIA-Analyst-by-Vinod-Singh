/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SeriesInfo } from './types';

export const DEFAULT_SERIES: SeriesInfo[] = [
  // STOCKS
  { sk: 'WCRSTUS1', desc: 'U.S. Commercial Crude Oil Stocks (Excluding Strategic Petroleum Reserve)', cat: 'Stocks' },
  { sk: 'WCSSTUS1', desc: 'U.S. Crude Oil in the Strategic Petroleum Reserve Stocks', cat: 'Stocks' },
  { sk: 'WGTSTUS1', desc: 'U.S. Total Motor Gasoline Stocks', cat: 'Stocks' },
  { sk: 'WDSTUS1', desc: 'U.S. Distillate Fuel Oil Stocks', cat: 'Stocks' },
  { sk: 'W_EPJK_SAX_Y05LA_MBBLD', desc: 'U.S. Kerosene-Type Jet Fuel Stocks', cat: 'Stocks' },
  
  // PADD Stocks
  { sk: 'W_EPC0_STO_R10_MBBL', desc: 'PADD 1 Stocks of Commercial Crude Oil', cat: 'Stocks' },
  { sk: 'W_EPC0_STO_R20_MBBL', desc: 'PADD 2 Stocks of Commercial Crude Oil', cat: 'Stocks' },
  { sk: 'W_EPC0_STO_R30_MBBL', desc: 'PADD 3 Stocks of Commercial Crude Oil', cat: 'Stocks' },
  { sk: 'W_EPC0_STO_R40_MBBL', desc: 'PADD 4 Stocks of Commercial Crude Oil', cat: 'Stocks' },
  { sk: 'W_EPC0_STO_R50_MBBL', desc: 'PADD 5 Stocks of Commercial Crude Oil', cat: 'Stocks' },

  // PRODUCTION
  { sk: 'WCRFPUS2', desc: 'U.S. Field Production of Crude Oil', cat: 'Production' },

  // REFINERY ACTIVITY
  { sk: 'WPUOPUS2', desc: 'U.S. Percent Operable Utilization Rate of Refineries', cat: 'Refinery Activity' },
  { sk: 'WRGIPUS2', desc: 'U.S. Refinery Gross Inputs of crude oil', cat: 'Refinery Activity' },
  { sk: 'WRIOPUS2', desc: 'U.S. Refinery Net Inputs of crude oil', cat: 'Refinery Activity' },

  // REFINERY PRODUCTION
  { sk: 'WRPUP_US_2', desc: 'U.S. Refinery Production of Finished Motor Gasoline', cat: 'Refinery Production' },
  { sk: 'WRPUP_US_D', desc: 'U.S. Refinery Production of Distillate Fuel Oil', cat: 'Refinery Production' },

  // PRODUCT SUPPLIED
  { sk: 'WGFUPUS2', desc: 'U.S. Product Supplied of Finished Motor Gasoline', cat: 'Product Supplied' },
  { sk: 'WDFUPUS2', desc: 'U.S. Product Supplied of Distillate Fuel Oil', cat: 'Product Supplied' },
  { sk: 'WJFUPUS2', desc: 'U.S. Product Supplied of Kerosene-Type Jet Fuel', cat: 'Product Supplied' },

  // IMPORTS
  { sk: 'WCRIMUS2', desc: 'U.S. Imports of Crude Oil', cat: 'Imports' },
  { sk: 'WGIM_US_2', desc: 'U.S. Imports of Total Motor Gasoline', cat: 'Imports' },

  // EXPORTS
  { sk: 'WCREXUS2', desc: 'U.S. Exports of Crude Oil', cat: 'Exports' },
  { sk: 'WGEX_US_2', desc: 'U.S. Exports of Total Motor Gasoline', cat: 'Exports' },

  // PRICES
  { sk: 'RWTC', desc: 'Cushing, OK WTI Crude Oil Spot Price FOB (Dollars per Barrel)', cat: 'Prices' },
  { sk: 'RBRTE', desc: 'Europe Brent Crude Oil Spot Price FOB (Dollars per Barrel)', cat: 'Prices' },
  { sk: 'EMM_EPMRU_PTE_NUS_DPG', desc: 'U.S. Weekly Regular All Grades All Formulations Retail Gasoline Prices (Dollars per Gallon)', cat: 'Prices' },
  { sk: 'EMD_EPD2D_PTE_NUS_DPG', desc: 'U.S. Weekly No 2 Diesel Retail Prices (Dollars per Gallon)', cat: 'Prices' },
];
