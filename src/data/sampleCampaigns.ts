import { Campaign } from '../types/campaign';
import { generateDeterministicPresentationDeck } from '../features/presentations/services/demoDeckGenerator';

export const SAMPLE_CAMPAIGNS: Campaign[] = [
  {
    id: 'campaign-phoenix-fix-flip',
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-08-18T14:30:00Z',
    name: 'Demo · Phoenix Value-Add Single Family Flip ($285k Basis)',
    status: 'completed',
    tags: ['Demo', 'Fictional', 'Value-Add', 'Single Family', 'Phoenix Metro'],
    brandKitId: 'brand-default',
    sourceData: {
      campaignType: 'fix_and_flip',
      title: 'Phoenix 3-Bed Value-Add Flip Opportunity',
      targetMarket: 'Phoenix, AZ (Arcadia Lite Submarket)',
      uploadedImages: [
        {
          id: 'phx-img-1',
          url: '/demo/fictional-property-exterior.png',
          name: 'Fictional Demo Exterior',
          source: 'sample',
          aspectRatio: 1.5,
          isHero: true,
          altText: 'Modern ranch-style home exterior in Phoenix with desert landscaping',
        },
        {
          id: 'phx-img-2',
          url: '/demo/fictional-property-interior.png',
          name: 'Fictional Demo Kitchen & Living Layout',
          source: 'sample',
          aspectRatio: 1.5,
          isHero: false,
          altText: 'Open concept interior living space with natural lighting',
        },
      ],
      selectedHeroImageId: 'phx-img-1',
      property: {
        address: '4421 E Cambridge Ave',
        city: 'Phoenix',
        state: 'AZ',
        zipCode: '85008',
        neighborhood: 'Arcadia Lite Corridor',
        propertyType: 'single_family',
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1840,
        lotSizeSqFt: 7200,
        yearBuilt: 1978,
        financials: {
          purchasePrice: 285000,
          renovationEstimate: 35000,
          arv: 390000,
          projectedProfit: 45000,
          equitySpread: 70000,
          roiPercent: 21.9,
        },
        investmentThesis: 'Acquire at $155/sqft ($75k below recent neighborhood comps). Minor cosmetic scope (kitchen reface, bathroom modernize, interior/exterior paint, desert turf). 60-day turnaround projected for resale to owner-occupant buyers.',
        renovationScope: 'Cabinet refinishing & quartz counters, LVP flooring throughout, dual vanity bath upgrade, low-water exterior curb appeal.',
        dealHighlights: [
          'Purchase basis: $285,000 ($154.89/sqft)',
          'Estimated renovation: $35,000 (Cosmetic only)',
          'Conservative ARV: $390,000 ($211.96/sqft)',
          '$70,000 gross equity spread (21.9% on cost) before disposition costs',
          'Submarket average DOM currently 24 days',
        ],
        notes: 'Clear title, vacant on close, standard 10-day inspection period. DEMO / FICTIONAL SAMPLE.',
      },
    },
    strategy: {
      targetAudience: {
        name: 'Active Fix & Flip Investors & Private Capital Partners',
        description: 'Local and regional real estate investors seeking clean cosmetic flips with documented spread and strong submarket liquidity.',
        painPoints: [
          'High acquisition competition on MLS driving down margins',
          'Heavy foundation/structural risk on older inventory',
          'Unrealistic seller ARV expectations',
        ],
        motivations: [
          'Under-market purchase price with immediate equity buffer',
          'Light cosmetic scope minimizing supply-chain delay',
          'Liquid Phoenix submarket with under-30-day average listing duration',
        ],
      },
      primaryObjective: 'Secure qualified cash buyer or private capital partner within 7 business days.',
      coreAngle: 'Clear $70k Spread on a Light Cosmetic Scope in High-Demand Arcadia Corridor',
      keyHooks: [
        '$285k purchase with $390k validated ARV comps',
        'Cosmetic-only $35k renovation scope (no structural work)',
        '$155/sqft entry price vs. $215/sqft neighborhood median',
      ],
      valueProposition: 'Underwritten value-add property offering an immediate $70,000 gross spread (21.9% on cost) with strict cosmetic scope and verified comp support.',
      supportingEvidence: [
        'Recent comp 4318 E Cambridge sold at $405,000 (1,810 sqft, renovated)',
        'Recent comp 4502 E Montecito sold at $392,000 (1,780 sqft, standard update)',
        'Submarket inventory stands at 1.8 months supply',
      ],
      ctaStrategy: 'Drive inbound inquiries directly to full underwriting package and inspection report.',
      suggestedPlatforms: ['facebook', 'instagram', 'linkedin', 'email', 'video_reels'],
    },
    copy: {
      headlines: [
        'Phoenix Value-Add Opportunity: $285k Entry with $390k Conservative ARV',
        'Light Cosmetic Flip in Arcadia Corridor: $70,000 Projected Gross Spread',
        'Off-Market Phoenix 3-Bed: $155/SF Basis with Verified Comp Support',
      ],
      ctas: [
        'Request Full Underwriting Pro Forma & Inspection Report',
        'Schedule Private Walkthrough or Access Deal Room',
        'Contact Acquisitions Team for Detailed Scope & Comps',
      ],
      facebook: {
        headline: 'Phoenix Value-Add Opportunity: $285k Purchase / $390k ARV',
        body: 'New acquisition opportunity in Phoenix (Arcadia Lite submarket).\n\nKey economics:\n• Purchase Price: $285,000 ($155/sqft)\n• Estimated Renovation: $35,000 (cosmetic scope)\n• Conservative ARV: $390,000\n• Projected Gross Spread: $70,000 (21.9% on cost)\n\nProperty details: 3 bedrooms, 2 baths, 1,840 sq ft on a 7,200 sq ft lot. Built 1978 with clean structural inspection.\n\nComps in immediate 0.5-mile radius support $210–$225/sqft for completed finishes. Submarket days on market currently averages 24 days.\n\nFull scope breakdown, comparable sales matrix, and inspection notes are available for verified buyers.',
        cta: 'Comment or message "PHOENIX" to receive the underwriting file.',
        characterCount: 618,
      },
      instagram: {
        headline: '$285K Basis | $390K ARV | Phoenix Value-Add',
        body: 'Underwriting breakdown on our newest Phoenix acquisition:\n\n📍 Phoenix, AZ (Arcadia Lite Corridor)\n📐 3 Bed | 2 Bath | 1,840 Sq Ft\n💵 Purchase Price: $285,000 ($155/SF)\n🔨 Estimated Scope: $35,000 (Cosmetic)\n📈 Underwritten ARV: $390,000 ($212/SF)\n💰 Projected Gross Spread: $70,000 (21.9% on cost)\n\nScope overview: Kitchen reface with quartz counters, LVP flooring throughout, dual-vanity master upgrade, and desert landscape refresh. Zero structural or foundation work required.\n\nRecent renovated comp at 4318 E Cambridge closed at $405,000.\n\nLink in bio for full deal deck and photo archive.',
        cta: 'Link in bio for full underwriting deck.',
        hashtags: ['#PhoenixRealEstate', '#RealEstateInvesting', '#FixAndFlip', '#ValueAddRealEstate', '#PropertyInvestment', '#ArizonaRealEstate'],
        characterCount: 685,
      },
      linkedin: {
        headline: 'Acquisition Underwriting Brief: 4421 E Cambridge Ave, Phoenix AZ',
        body: 'Investment Memorandum Summary:\n\nWe have underwritten and secured an off-market value-add single family asset in the Phoenix Arcadia Lite corridor.\n\nTransaction Metrics:\n• Acquisition Basis: $285,000 ($154.89/sqft)\n• Capital Expenditure Budget: $35,000 (Cosmetic refit)\n• Total Project Basis: $320,000\n• Underwritten Exit (ARV): $390,000 ($211.96/sqft)\n• Projected Gross Margin: 21.9% on cost ($70,000 gross spread before holding/selling costs)\n\nMarket Context:\nThe central Phoenix submarket maintains 1.8 months of inventory for sub-$450k renovated single-family product. With an average marketing time of 24 days, demand for turn-key starter homes remains resilient against broader interest rate friction.\n\nThe project scope is strictly interior/exterior cosmetic modernization without structural alterations, limiting timeline and supply-chain exposure (60-day projected turnaround).\n\nAccredited partners and operators can review the full financial pro forma and contractor line-item scope upon request.',
        cta: 'Connect or direct message for the complete investment memorandum.',
        characterCount: 978,
      },
      emailNewsletter: {
        subjectLines: [
          'Deal Brief: Phoenix 3-Bed Value-Add ($285k Basis / $390k ARV)',
          'New Underwriting: $70k Spread on Arcadia Lite Cosmetic Flip',
          '[Investment Memo] 4421 E Cambridge Ave — Phoenix, AZ',
        ],
        previewText: '$285k purchase price with $35k cosmetic scope and $390k verified comp ARV in Phoenix.',
        bodyMarkdown: `### Executive Deal Summary: 4421 E Cambridge Ave

We are presenting the underwriting package for our newest acquisition in the Phoenix Arcadia Lite submarket.

#### Core Financial Metrics
* **Purchase Price:** $285,000 ($154.89/sqft)
* **Estimated Renovation:** $35,000
* **All-In Basis:** $320,000
* **After Repair Value (ARV):** $390,000
* **Projected Gross Spread:** $70,000 (21.9% on total cost)
* **Target Turnaround:** 60 Days (30-day renovation + 30-day disposition)

#### Property Specifications
* **Configuration:** 3 Bed / 2 Bath
* **Square Footage:** 1,840 SF
* **Lot Size:** 7,200 SF
* **Year Built:** 1978

#### Renovation Scope
The budget covers kitchen modernization (refaced cabinets, quartz countertops, stainless fixtures), continuous luxury vinyl plank flooring, bathroom updates, and exterior curb appeal paint and xeriscaping.

#### Comparable Sales
1. **4318 E Cambridge:** 1,810 SF — Sold $405,000 ($223.75/SF)
2. **4502 E Montecito:** 1,780 SF — Sold $392,000 ($220.22/SF)

To access the complete photo gallery, title commitments, and line-item scope, please click below.`,
        ctaButtonText: 'Download Full Underwriting Package',
      },
      videoScript: {
        title: '60-Second Property Breakdown: Phoenix Value-Add',
        durationSeconds: 58,
        targetFormat: '9:16 vertical reel',
        hook: 'How to find a $70,000 spread in Phoenix without touching a single load-bearing wall.',
        callToAction: 'Comment DEAL below or tap the link in bio to see the exact numbers and comps.',
        scenes: [
          {
            timeframe: '0:00 - 0:05',
            visualDirection: 'Front elevation shot, pointing out exterior character and roof condition. Text overlay with price.',
            spokenAudio: 'This 3-bed home in Phoenix was just secured at $285,000. That’s $155 a square foot in a submarket where renovated comps are closing over $215.',
            onScreenText: '$285,000 Purchase | $155/SF',
          },
          {
            timeframe: '0:05 - 0:20',
            visualDirection: 'Walking through open living area into kitchen. Quick pans of solid cabinet boxes and floor layout.',
            spokenAudio: 'Here is the math: our renovation budget is $35,000. We are doing cosmetic-only updates—new quartz tops, cabinet refacing, LVP flooring, and bathroom modernization. No structural moves.',
            onScreenText: '$35K Cosmetic Renovation Budget',
          },
          {
            timeframe: '0:20 - 0:40',
            visualDirection: 'Show master bedroom and backyard space. Quick split screen showing the two recent comps.',
            spokenAudio: 'All-in basis is $320,000. Comps directly on this street closed at $392k and $405k within the last 60 days. That leaves a conservative $70,000 gross spread.',
            onScreenText: 'Comps: $392K & $405K | ARV: $390,000',
          },
          {
            timeframe: '0:40 - 0:58',
            visualDirection: 'Host to camera with property background. Clear CTA banner.',
            spokenAudio: 'With days on market under 25 days in this pocket, execution speed is everything. Tap the link in bio or comment DEAL to get the complete pro forma and contractor bid.',
            onScreenText: 'Comment "DEAL" for Full Pro Forma',
          },
        ],
      },
      qualityReport: {
        overallScore: 96,
        slopIndex: 'clean',
        factualIntegrityVerified: true,
        unsupportedClaimsDetected: [],
        issues: [],
      },
    },
    designConfigs: {
      square: {
        templateFamily: 'editorial',
        aspectRatio: 'square',
        headline: 'Phoenix Value-Add Opportunity',
        subtitle: '4421 E Cambridge Ave | Arcadia Lite Corridor',
        imageId: 'phx-img-1',
        imageCropY: 45,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'reno', 'arv', 'spread'],
        customBadgeText: 'OFF-MARKET ACQUISITION',
        customCtaText: 'REQUEST PRO FORMA',
        showDisclaimer: true,
      },
      portrait: {
        templateFamily: 'institutional',
        aspectRatio: 'portrait',
        headline: '$285,000 Purchase Basis with $390,000 ARV',
        subtitle: 'Phoenix Single Family Value-Add | $70,000 Gross Spread',
        imageId: 'phx-img-1',
        imageCropY: 50,
        imageZoom: 1.05,
        activeMetricIds: ['purchase', 'reno', 'arv', 'spread'],
        customBadgeText: 'INVESTMENT MEMO',
        customCtaText: 'ACCESS DEAL ROOM',
        showDisclaimer: true,
      },
      story: {
        templateFamily: 'direct_response',
        aspectRatio: 'story',
        headline: '$70K Gross Spread in Phoenix',
        subtitle: '3 Bed / 2 Bath | $35K Cosmetic Scope',
        imageId: 'phx-img-1',
        imageCropY: 35,
        imageZoom: 1.1,
        activeMetricIds: ['purchase', 'reno', 'arv'],
        customBadgeText: 'UNDERWRITING BRIEF',
        customCtaText: 'VIEW DEAL DECK',
        showDisclaimer: false,
      },
      landscape: {
        templateFamily: 'modern_brokerage',
        aspectRatio: 'landscape',
        headline: 'Phoenix Value-Add: $285k Basis / $390k ARV',
        subtitle: 'Arcadia Lite Corridor | 1,840 SF Single Family',
        imageId: 'phx-img-1',
        imageCropY: 40,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'arv', 'spread'],
        customBadgeText: 'OPPORTUNITY BRIEF',
        customCtaText: 'VIEW DETAILS',
        showDisclaimer: true,
      },
      flyer_letter: {
        templateFamily: 'institutional',
        aspectRatio: 'flyer_letter',
        headline: 'Property Investment Memorandum',
        subtitle: '4421 E Cambridge Ave, Phoenix, AZ 85008',
        imageId: 'phx-img-1',
        imageCropY: 45,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'reno', 'all_in', 'arv', 'spread', 'sqft'],
        customBadgeText: 'CONFIDENTIAL DEAL BRIEF',
        customCtaText: 'CONTACT ACQUISITIONS TEAM',
        showDisclaimer: true,
      },
      flyer_a4: {
        templateFamily: 'institutional',
        aspectRatio: 'flyer_a4',
        headline: 'Property Investment Memorandum',
        subtitle: '4421 E Cambridge Ave, Phoenix, AZ 85008',
        imageId: 'phx-img-1',
        imageCropY: 45,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'reno', 'all_in', 'arv', 'spread', 'sqft'],
        customBadgeText: 'CONFIDENTIAL DEAL BRIEF',
        customCtaText: 'CONTACT ACQUISITIONS TEAM',
        showDisclaimer: true,
      },
    },
  },
  {
    id: 'campaign-dallas-multifamily',
    createdAt: '2026-08-12T11:00:00Z',
    updatedAt: '2026-08-17T16:00:00Z',
    name: 'Demo · Dallas 8-Unit Multi-Family Cash Flow (9.4% Stabilized Cap)',
    status: 'completed',
    tags: ['Demo', 'Fictional', 'Multi-Family', 'Cash Flow', 'Dallas-Fort Worth'],
    brandKitId: 'brand-default',
    sourceData: {
      campaignType: 'cash_flow_rental',
      title: 'Dallas 8-Unit Value-Add Multi-Family',
      targetMarket: 'Dallas-Fort Worth, TX (East Dallas / Lakewood Fringe)',
      uploadedImages: [
        {
          id: 'dal-img-1',
          url: '/demo/multifamily-exterior.png',
          name: 'Fictional Demo Multi-Family Exterior',
          source: 'sample',
          aspectRatio: 1.5,
          isHero: true,
          altText: 'Boutique garden-style apartment building in Dallas with modern brick facade',
        },
        {
          id: 'dal-img-2',
          url: '/demo/multifamily-interior.png',
          name: 'Fictional Demo Unit Interior',
          source: 'sample',
          aspectRatio: 1.5,
          isHero: false,
          altText: 'Modernized apartment living room with hardwood floors and open kitchen',
        },
      ],
      selectedHeroImageId: 'dal-img-1',
      property: {
        address: '1824 Skillman St',
        city: 'Dallas',
        state: 'TX',
        zipCode: '75206',
        neighborhood: 'East Dallas Submarket',
        propertyType: 'multi_family',
        bedrooms: 16,
        bathrooms: 8,
        squareFeet: 6400,
        lotSizeSqFt: 14500,
        yearBuilt: 1984,
        financials: {
          purchasePrice: 1150000,
          renovationEstimate: 96000,
          inPlaceNOI: 78200,
          stabilizedNOI: 108100,
          currentRentMonthly: 8400,
          projectedRentMonthly: 11200,
          capRatePercent: 9.4,
        },
        investmentThesis: 'Acquire 8 two-bedroom units currently rented at $1,050/mo ($350/mo below market). Execute $12k/unit cosmetic modernization program upon natural lease roll. Stabilize at $1,400/mo to achieve 9.4% stabilized cap rate on acquisition basis (8.7% yield on total project cost).',
        dealHighlights: [
          '8 Units: All 2 Bed / 1 Bath layouts (800 sq ft each)',
          'Purchase basis: $143,750 / door ($179.69/SF)',
          'Current In-Place Gross: $100,800/yr ($1,050/unit)',
          'Stabilized Pro Forma Gross: $134,400/yr ($1,400/unit)',
          'In-Place Cap: 6.8% | Stabilized Cap: 9.4% on purchase (8.7% yield on cost)',
        ],
        notes: 'DEMO / FICTIONAL SAMPLE. 100% occupied garden apartments with individual meters.',
      },
    },
    strategy: {
      targetAudience: {
        name: 'Private Capital Investors & Multi-Family Operators',
        description: 'Passive and active real estate investors looking for yield-generating multi-family assets with built-in rent upside in growth metros.',
        painPoints: [
          'Low in-place yields on turnkey institutional assets (<5% cap rates)',
          'Severe deferred maintenance on older multi-family stock',
        ],
        motivations: [
          'Sub-$150k per door entry basis in East Dallas',
          'Clear $350/mo rent gap to surrounding market comparables',
          'Strong 9.4% stabilized cap rate upon unit turnover',
        ],
      },
      primaryObjective: 'Attract qualified co-investors or 1031 exchange buyers seeking immediate cash flow and upside.',
      coreAngle: '8-Unit Dallas Asset with $2,800/mo In-Place Rent Upside and 9.4% Stabilized Cap',
      keyHooks: [
        '$143,750 per door in East Dallas submarket',
        'In-place 6.8% cap moving to 9.4% upon $12k/unit cosmetic turn',
        'Fully occupied with strong tenant payment history',
      ],
      valueProposition: 'Boutique 8-unit multi-family property positioned for substantial yield expansion via disciplined unit modernization ($350/unit rent upside).',
      supportingEvidence: [
        'Surrounding renovated 2-beds achieving $1,450–$1,550/mo',
        'East Dallas submarket vacancy rate below 4.5%',
      ],
      ctaStrategy: 'Drive qualified inquiries to the multi-family pro forma and rent roll analysis.',
      suggestedPlatforms: ['linkedin', 'email', 'facebook'],
    },
    copy: {
      headlines: [
        'Dallas 8-Unit Multi-Family: 9.4% Stabilized Cap Rate in East Dallas',
        '$143k / Door with $2,800/Mo In-Place Rent Upside',
        'Value-Add Apartment Opportunity: 1824 Skillman St, Dallas TX',
      ],
      ctas: [
        'Request Rent Roll, T-12 Financials & Underwriting Model',
        'Download Multi-Family Investment Memorandum',
        'Schedule Private Discussion with Acquisitions Partner',
      ],
      facebook: {
        headline: 'Dallas Multi-Family Opportunity: 8 Units with 9.4% Stabilized Cap',
        body: 'New multi-family investment brief in East Dallas.\n\nProperty Overview:\n• 8 Units (all 2 Bed / 1 Bath, 800 SF)\n• Purchase Price: $1,150,000 ($143,750/door)\n• Current Rent: $1,050/unit ($8,400/mo total)\n• Market Comps: $1,400/unit ($11,200/mo total)\n• Capital Plan: $12,000/door cosmetic upgrade ($96,000 total)\n• In-Place Cap: 6.8% | Stabilized Cap: 9.4% on purchase (8.7% yield on total cost)\n\n100% occupied with low historical turnover. Ideal for 1031 exchange or private portfolio expansion.',
        cta: 'Message or comment "DALLAS" for the rent roll and pro forma model.',
        characterCount: 520,
      },
      instagram: {
        headline: '8-Unit East Dallas Multi-Family | 9.4% Cap Rate',
        body: 'Deal Breakdown: Boutique 8-Unit Apartment in Dallas, TX\n\n🏢 8 Units (All 2 Bed / 1 Bath)\n📍 East Dallas / Lakewood Corridor\n💰 Purchase: $1,150,000 ($143K/Door)\n📊 Current Gross: $8,400/mo ($1,050/unit)\n📈 Market Potential: $11,200/mo ($1,400/unit)\n🛠 Value-Add Plan: $12K/unit interior refresh\n🎯 Projected Stabilized Cap: 9.4% (8.7% yield on cost)\n\nSurrounding 2-bed units are leasing at $1,450–$1,550/mo. Clean mechanicals with individual HVAC and submetered electric.',
        cta: 'Link in bio for rent roll and full deal memo.',
        hashtags: ['#DallasRealEstate', '#MultifamilyInvesting', '#CommercialRealEstate', '#CashFlow', '#ApartmentInvesting', '#TexasRealEstate'],
        characterCount: 590,
      },
      linkedin: {
        headline: 'Commercial Underwriting Brief: 8-Unit Value-Add Multi-Family | Dallas, TX',
        body: 'Executive Summary:\n\nWe have underwritten an 8-unit boutique garden-style apartment community in the East Dallas submarket.\n\nKey Acquisition Metrics:\n• Purchase Price: $1,150,000 ($143,750 / unit | $179.69 / SF)\n• Total Unit Count: 8 identical 2 Bed / 1 Bath floorplans (800 SF avg)\n• In-Place NOI: $78,200 (6.80% in-place capitalization)\n• Projected Stabilized NOI: $108,100 (9.40% on purchase price | 8.68% yield on total project cost)\n• Capital Improvement Budget: $96,000 ($12,000 / unit interior modernization)\n\nUnderwriting Thesis:\nCurrent rents average $1,050/mo, representing a $350/mo discount to renovated submarket comparables ($1,400–$1,450/mo). The property features pitched roofs, individual tenant-paid electric, and dedicated off-street parking.\n\nThis asset represents a high-probability yield optimization play suitable for private capital deployment or 1031 exchange replacement.',
        cta: 'Contact directly for T-12 financials, trailing rent roll, and interactive underwriting model.',
        characterCount: 955,
      },
      emailNewsletter: {
        subjectLines: [
          'Investment Memo: Dallas 8-Unit Multi-Family (9.4% Stabilized Cap)',
          'New Acquisition: East Dallas 8-Unit with $2,800/mo Rent Upside',
          '[Deal Package] 1824 Skillman St — 8 Units at $143k/Door',
        ],
        previewText: '8-unit East Dallas multi-family asset at $143,750/door with verified $350/unit monthly rent upside.',
        bodyMarkdown: `### Multi-Family Deal Brief: 1824 Skillman St, Dallas TX

#### Executive Financial Overview
* **Purchase Price:** $1,150,000 ($143,750/unit)
* **Current In-Place Rents:** $1,050/unit ($8,400/month)
* **Pro Forma Stabilized Rents:** $1,400/unit ($11,200/month)
* **Monthly Rent Upside:** $2,800/month ($33,600/year gross)
* **Interior Renovation Plan:** $12,000/door ($96,000 total)
* **In-Place Cap Rate:** 6.80%
* **Stabilized Cap Rate:** 9.40% on purchase (8.68% yield on total project cost)

#### Property Specifications
* **Units:** 8 units (all 2 Bed / 1 Bath, ~800 SF)
* **Building Size:** 6,400 SF
* **Lot Size:** 0.33 Acres
* **Year Built:** 1984

#### Investment Highlights
1. **Strong In-Place Occupancy:** Currently 100% occupied with zero delinquencies.
2. **Clear Value-Add Path:** In-place rents are $350/unit below market comparables in East Dallas.
3. **Low Maintenance Architecture:** Pitched composition shingle roof, individual HVAC split systems, separate electric meters.`,
        ctaButtonText: 'Access T-12, Rent Roll & Financial Model',
      },
      videoScript: {
        title: 'Multi-Family Deal Breakdown: East Dallas 8-Plex',
        durationSeconds: 55,
        targetFormat: '9:16 vertical reel',
        hook: 'Why buying 8 units in Dallas at $143,000 a door is one of the cleanest value-add plays right now.',
        callToAction: 'Comment CASHFLOW below or click the link in bio to see the rent roll.',
        scenes: [
          {
            timeframe: '0:00 - 0:05',
            visualDirection: 'Exterior building shot with clean graphics displaying price and unit count.',
            spokenAudio: 'Here is an 8-unit multi-family property in East Dallas acquired at $1.15M. That’s just $143,000 per door.',
            onScreenText: '$1.15M Purchase | 8 Units ($143K/Door)',
          },
          {
            timeframe: '0:05 - 0:25',
            visualDirection: 'Interior shot of current unit followed by comparison graphic.',
            spokenAudio: 'All 8 units are 2-bedroom, 1-bath layouts currently rented at $1,050 a month. But renovated 2-beds on this exact corridor are leasing for $1,400 to $1,500.',
            onScreenText: 'Current Rent: $1,050/mo ➔ Comps: $1,400/mo (+$350/mo)',
          },
          {
            timeframe: '0:25 - 0:45',
            visualDirection: 'Financial summary card highlighting stabilized cap rate.',
            spokenAudio: 'With a modest $12,000 per door cosmetic update upon lease turnover, the gross rent increases by over $33,000 annually, pushing our stabilized cap rate to 9.4%.',
            onScreenText: '+$33,600/yr Gross Rent Upside | 9.4% Cap',
          },
          {
            timeframe: '0:45 - 0:55',
            visualDirection: 'Host closing with clear CTA.',
            spokenAudio: 'Comment CASHFLOW or tap the link in bio to get the full T-12 and underwriting file.',
            onScreenText: 'Comment "CASHFLOW" for Full Package',
          },
        ],
      },
      qualityReport: {
        overallScore: 98,
        slopIndex: 'clean',
        factualIntegrityVerified: true,
        unsupportedClaimsDetected: [],
        issues: [],
      },
    },
    designConfigs: {
      square: {
        templateFamily: 'institutional',
        aspectRatio: 'square',
        headline: 'Dallas 8-Unit Multi-Family',
        subtitle: '1824 Skillman St | East Dallas Corridor',
        imageId: 'dal-img-1',
        imageCropY: 50,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'doors', 'cap_rate', 'rent_upside'],
        customBadgeText: 'COMMERCIAL ACQUISITION',
        customCtaText: 'REQUEST RENT ROLL',
        showDisclaimer: true,
      },
      portrait: {
        templateFamily: 'institutional',
        aspectRatio: 'portrait',
        headline: '9.4% Stabilized Cap Rate Multi-Family',
        subtitle: '8 Units in East Dallas | $143,750 / Door Basis',
        imageId: 'dal-img-1',
        imageCropY: 45,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'doors', 'cap_rate', 'rent_upside'],
        customBadgeText: 'INVESTMENT MEMO',
        customCtaText: 'DOWNLOAD PRO FORMA',
        showDisclaimer: true,
      },
      story: {
        templateFamily: 'direct_response',
        aspectRatio: 'story',
        headline: '9.4% Cap Multi-Family in Dallas',
        subtitle: '8 Units | $143K / Door | $2.8K/Mo Rent Upside',
        imageId: 'dal-img-1',
        imageCropY: 30,
        imageZoom: 1.05,
        activeMetricIds: ['purchase', 'doors', 'cap_rate'],
        customBadgeText: 'COMMERCIAL DEAL BRIEF',
        customCtaText: 'TAP FOR RENT ROLL',
        showDisclaimer: false,
      },
      landscape: {
        templateFamily: 'institutional',
        aspectRatio: 'landscape',
        headline: 'Dallas 8-Unit Multi-Family: 9.4% Stabilized Cap',
        subtitle: '$143,750 / Door | East Dallas Submarket',
        imageId: 'dal-img-1',
        imageCropY: 40,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'doors', 'cap_rate'],
        customBadgeText: 'OPPORTUNITY BRIEF',
        customCtaText: 'REQUEST UNDERWRITING',
        showDisclaimer: true,
      },
      flyer_letter: {
        templateFamily: 'institutional',
        aspectRatio: 'flyer_letter',
        headline: 'Commercial Multi-Family Investment Memorandum',
        subtitle: '1824 Skillman St, Dallas, TX 75206',
        imageId: 'dal-img-1',
        imageCropY: 45,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'doors', 'in_place_cap', 'cap_rate', 'rent_upside', 'sqft'],
        customBadgeText: 'CONFIDENTIAL OFFERING',
        customCtaText: 'REQUEST OFFERING MEMORANDUM',
        showDisclaimer: true,
      },
      flyer_a4: {
        templateFamily: 'institutional',
        aspectRatio: 'flyer_a4',
        headline: 'Commercial Multi-Family Investment Memorandum',
        subtitle: '1824 Skillman St, Dallas, TX 75206',
        imageId: 'dal-img-1',
        imageCropY: 45,
        imageZoom: 1.0,
        activeMetricIds: ['purchase', 'doors', 'in_place_cap', 'cap_rate', 'rent_upside', 'sqft'],
        customBadgeText: 'CONFIDENTIAL OFFERING',
        customCtaText: 'REQUEST OFFERING MEMORANDUM',
        showDisclaimer: true,
      },
    },
  },
];

SAMPLE_CAMPAIGNS.forEach((c) => {
  if (!c.presentation) {
    c.presentation = generateDeterministicPresentationDeck(c);
  }
});
