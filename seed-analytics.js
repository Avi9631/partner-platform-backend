require('dotenv').config();
const db = require('./src/entity');

async function seedListingAnalytics() {
  try {
    console.log('Starting to seed listing analytics data...');
    
    const { ListingAnalytics } = db;
    
    // Property 13 views (last 7 days) - 16 records
    const property13Views = [];
    
    // Today's views
    property13Views.push(
      { listingType: 'property', listingId: 13, viewDuration: 45, sessionId: 'session_001', ipAddress: '192.168.1.100', deviceType: 'desktop', country: 'India', city: 'Mumbai', viewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 120, sessionId: 'session_002', ipAddress: '192.168.1.101', deviceType: 'mobile', country: 'India', city: 'Delhi', viewedAt: new Date(Date.now() - 5 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 90, sessionId: 'session_003', ipAddress: '192.168.1.102', deviceType: 'tablet', country: 'India', city: 'Bangalore', viewedAt: new Date(Date.now() - 8 * 60 * 60 * 1000) }
    );
    
    // Yesterday
    property13Views.push(
      { listingType: 'property', listingId: 13, viewDuration: 60, sessionId: 'session_004', ipAddress: '192.168.1.103', deviceType: 'desktop', country: 'India', city: 'Pune', viewedAt: new Date(Date.now() - 27 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 150, sessionId: 'session_005', ipAddress: '192.168.1.104', deviceType: 'mobile', country: 'India', city: 'Hyderabad', viewedAt: new Date(Date.now() - 30 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 75, sessionId: 'session_006', ipAddress: '192.168.1.105', deviceType: 'desktop', country: 'India', city: 'Chennai', viewedAt: new Date(Date.now() - 34 * 60 * 60 * 1000) }
    );
    
    // 2 days ago
    property13Views.push(
      { listingType: 'property', listingId: 13, viewDuration: 30, sessionId: 'session_007', ipAddress: '192.168.1.106', deviceType: 'mobile', country: 'India', city: 'Kolkata', viewedAt: new Date(Date.now() - 52 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 180, sessionId: 'session_008', ipAddress: '192.168.1.107', deviceType: 'desktop', country: 'India', city: 'Ahmedabad', viewedAt: new Date(Date.now() - 56 * 60 * 60 * 1000) }
    );
    
    // 3 days ago
    property13Views.push(
      { listingType: 'property', listingId: 13, viewDuration: 95, sessionId: 'session_009', ipAddress: '192.168.1.108', deviceType: 'tablet', country: 'India', city: 'Jaipur', viewedAt: new Date(Date.now() - 74 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 110, sessionId: 'session_010', ipAddress: '192.168.1.109', deviceType: 'mobile', country: 'India', city: 'Surat', viewedAt: new Date(Date.now() - 79 * 60 * 60 * 1000) }
    );
    
    // 4 days ago
    property13Views.push(
      { listingType: 'property', listingId: 13, viewDuration: 55, sessionId: 'session_011', ipAddress: '192.168.1.110', deviceType: 'desktop', country: 'India', city: 'Lucknow', viewedAt: new Date(Date.now() - 101 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 140, sessionId: 'session_012', ipAddress: '192.168.1.111', deviceType: 'mobile', country: 'India', city: 'Kanpur', viewedAt: new Date(Date.now() - 105 * 60 * 60 * 1000) }
    );
    
    // 5 days ago
    property13Views.push(
      { listingType: 'property', listingId: 13, viewDuration: 85, sessionId: 'session_013', ipAddress: '192.168.1.112', deviceType: 'desktop', country: 'India', city: 'Nagpur', viewedAt: new Date(Date.now() - 123 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 125, sessionId: 'session_014', ipAddress: '192.168.1.113', deviceType: 'tablet', country: 'India', city: 'Indore', viewedAt: new Date(Date.now() - 131 * 60 * 60 * 1000) }
    );
    
    // 6 days ago
    property13Views.push(
      { listingType: 'property', listingId: 13, viewDuration: 70, sessionId: 'session_015', ipAddress: '192.168.1.114', deviceType: 'mobile', country: 'India', city: 'Bhopal', viewedAt: new Date(Date.now() - 148 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 160, sessionId: 'session_016', ipAddress: '192.168.1.115', deviceType: 'desktop', country: 'India', city: 'Visakhapatnam', viewedAt: new Date(Date.now() - 152 * 60 * 60 * 1000) }
    );
    
    // Insert property 13 views
    await ListingAnalytics.bulkCreate(property13Views);
    console.log(`✓ Inserted ${property13Views.length} views for Property 13`);
    
    // Other properties
    const otherViews = [
      // Property 14
      { listingType: 'property', listingId: 14, viewDuration: 50, sessionId: 'session_017', ipAddress: '192.168.1.116', deviceType: 'mobile', country: 'India', city: 'Mumbai', viewedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 14, viewDuration: 100, sessionId: 'session_018', ipAddress: '192.168.1.117', deviceType: 'desktop', country: 'India', city: 'Delhi', viewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      
      // Property 15
      { listingType: 'property', listingId: 15, viewDuration: 80, sessionId: 'session_019', ipAddress: '192.168.1.118', deviceType: 'tablet', country: 'India', city: 'Bangalore', viewedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 15, viewDuration: 135, sessionId: 'session_020', ipAddress: '192.168.1.119', deviceType: 'mobile', country: 'India', city: 'Pune', viewedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      
      // PG Hostels
      { listingType: 'pg_hostel', listingId: 1, viewDuration: 65, sessionId: 'session_021', ipAddress: '192.168.1.120', deviceType: 'mobile', country: 'India', city: 'Mumbai', viewedAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
      { listingType: 'pg_hostel', listingId: 1, viewDuration: 90, sessionId: 'session_022', ipAddress: '192.168.1.121', deviceType: 'desktop', country: 'India', city: 'Delhi', viewedAt: new Date(Date.now() - 26 * 60 * 60 * 1000) },
      { listingType: 'pg_hostel', listingId: 2, viewDuration: 45, sessionId: 'session_023', ipAddress: '192.168.1.122', deviceType: 'tablet', country: 'India', city: 'Bangalore', viewedAt: new Date(Date.now() - 5 * 60 * 60 * 1000) },
      
      // Projects
      { listingType: 'project', listingId: 1, viewDuration: 120, sessionId: 'session_024', ipAddress: '192.168.1.123', deviceType: 'desktop', country: 'India', city: 'Mumbai', viewedAt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
      { listingType: 'project', listingId: 1, viewDuration: 180, sessionId: 'session_025', ipAddress: '192.168.1.124', deviceType: 'mobile', country: 'India', city: 'Pune', viewedAt: new Date(Date.now() - 29 * 60 * 60 * 1000) },
      { listingType: 'project', listingId: 2, viewDuration: 95, sessionId: 'session_026', ipAddress: '192.168.1.125', deviceType: 'tablet', country: 'India', city: 'Delhi', viewedAt: new Date(Date.now() - 72 * 60 * 60 * 1000) },
      
      // Developers
      { listingType: 'developer', listingId: 1, viewDuration: 75, sessionId: 'session_027', ipAddress: '192.168.1.126', deviceType: 'desktop', country: 'India', city: 'Bangalore', viewedAt: new Date(Date.now() - 7 * 60 * 60 * 1000) },
      { listingType: 'developer', listingId: 1, viewDuration: 110, sessionId: 'session_028', ipAddress: '192.168.1.127', deviceType: 'mobile', country: 'India', city: 'Chennai', viewedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) }
    ];
    
    await ListingAnalytics.bulkCreate(otherViews);
    console.log(`✓ Inserted ${otherViews.length} views for other listings`);
    
    // Older data for trend analysis
    const olderViews = [
      { listingType: 'property', listingId: 13, viewDuration: 60, sessionId: 'session_029', ipAddress: '192.168.1.128', deviceType: 'mobile', country: 'India', city: 'Mumbai', viewedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 90, sessionId: 'session_030', ipAddress: '192.168.1.129', deviceType: 'desktop', country: 'India', city: 'Delhi', viewedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 45, sessionId: 'session_031', ipAddress: '192.168.1.130', deviceType: 'tablet', country: 'India', city: 'Bangalore', viewedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 120, sessionId: 'session_032', ipAddress: '192.168.1.131', deviceType: 'mobile', country: 'India', city: 'Pune', viewedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      { listingType: 'property', listingId: 13, viewDuration: 75, sessionId: 'session_033', ipAddress: '192.168.1.132', deviceType: 'desktop', country: 'India', city: 'Hyderabad', viewedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }
    ];
    
    await ListingAnalytics.bulkCreate(olderViews);
    console.log(`✓ Inserted ${olderViews.length} older views for trend analysis`);
    
    // Summary
    console.log('\n=== Summary ===');
    const summary = await ListingAnalytics.findAll({
      attributes: [
        'listingType',
        'listingId',
        [db.sequelize.fn('COUNT', db.sequelize.col('view_id')), 'viewCount'],
        [db.sequelize.fn('AVG', db.sequelize.col('view_duration')), 'avgDuration']
      ],
      group: ['listingType', 'listingId'],
      raw: true
    });
    
    console.table(summary);
    console.log('\n✓ Listing analytics data seeded successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedListingAnalytics();
