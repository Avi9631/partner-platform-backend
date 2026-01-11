require('dotenv').config();
const db = require('./src/entity');

async function seedListingLeads() {
  try {
    console.log('Starting to seed listing leads data...');
    
    const { ListingLead } = db;
    
    // Leads for Property 13
    const property13Leads = [
      // Recent NEW leads
      {
        listingType: 'PROPERTY',
        listingId: 13,
        reason: 'CONNECT_AGENT',
        customerName: 'Rajesh Kumar',
        customerEmail: 'rajesh.kumar@email.com',
        customerPhone: '+91-9876543210',
        customerMessage: 'Interested in viewing this property. Please contact me.',
        status: 'NEW',
        location: 'Mumbai, Maharashtra',
        preferredContactTime: 'Evening (6 PM - 8 PM)',
        partnerId: null,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        listingType: 'PROPERTY',
        listingId: 13,
        reason: 'CALLBACK_REQUEST',
        customerName: 'Priya Sharma',
        customerEmail: 'priya.sharma@email.com',
        customerPhone: '+91-9876543211',
        customerMessage: 'Looking for a property in this area. Need more details.',
        status: 'NEW',
        location: 'Delhi',
        preferredContactTime: 'Morning (10 AM - 12 PM)',
        partnerId: null,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
      },
      {
        listingType: 'PROPERTY',
        listingId: 13,
        reason: 'VIRTUAL_TOUR',
        customerName: 'Amit Patel',
        customerEmail: 'amit.patel@email.com',
        customerPhone: '+91-9876543212',
        customerMessage: 'Would like to schedule a virtual tour.',
        status: 'NEW',
        location: 'Bangalore',
        preferredContactTime: 'Afternoon (2 PM - 4 PM)',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        partnerId: null,
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000)
      },
      
      // CONTACTED leads
      {
        listingType: 'PROPERTY',
        listingId: 13,
        reason: 'CONNECT_AGENT',
        customerName: 'Sneha Reddy',
        customerEmail: 'sneha.reddy@email.com',
        customerPhone: '+91-9876543213',
        customerMessage: 'Urgently looking for property. Please call ASAP.',
        status: 'CONTACTED',
        location: 'Hyderabad',
        preferredContactTime: 'Anytime',
        partnerId: null,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        contactedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      {
        listingType: 'PROPERTY',
        listingId: 13,
        reason: 'CALLBACK_REQUEST',
        customerName: 'Vikram Singh',
        customerEmail: 'vikram.singh@email.com',
        customerPhone: '+91-9876543214',
        customerMessage: 'Need information about pricing and availability.',
        status: 'CONTACTED',
        location: 'Pune',
        preferredContactTime: 'Evening (5 PM - 7 PM)',
        partnerId: null,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        contactedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      
      // IN_PROGRESS leads
      {
        listingType: 'PROPERTY',
        listingId: 13,
        reason: 'VIRTUAL_TOUR',
        customerName: 'Deepa Menon',
        customerEmail: 'deepa.menon@email.com',
        customerPhone: '+91-9876543215',
        customerMessage: 'Attended virtual tour. Very interested. Need to discuss financing options.',
        status: 'IN_PROGRESS',
        location: 'Chennai',
        preferredContactTime: 'Morning (11 AM - 1 PM)',
        scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        partnerId: null,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        contactedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        listingType: 'PROPERTY',
        listingId: 13,
        reason: 'CONNECT_AGENT',
        customerName: 'Arjun Gupta',
        customerEmail: 'arjun.gupta@email.com',
        customerPhone: '+91-9876543216',
        customerMessage: 'Negotiating price. Very serious buyer.',
        status: 'IN_PROGRESS',
        location: 'Kolkata',
        preferredContactTime: 'Afternoon (3 PM - 5 PM)',
        partnerId: null,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
        contactedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      
      // COMPLETED leads
      {
        listingType: 'PROPERTY',
        listingId: 13,
        reason: 'CONNECT_AGENT',
        customerName: 'Kavita Joshi',
        customerEmail: 'kavita.joshi@email.com',
        customerPhone: '+91-9876543217',
        customerMessage: 'Deal finalized! Thank you.',
        status: 'COMPLETED',
        location: 'Ahmedabad',
        preferredContactTime: 'Morning (9 AM - 11 AM)',
        partnerId: null,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        contactedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        metadata: { dealValue: 5000000, commission: 50000 }
      },
      {
        listingType: 'PROPERTY',
        listingId: 13,
        reason: 'VIRTUAL_TOUR',
        customerName: 'Rahul Verma',
        customerEmail: 'rahul.verma@email.com',
        customerPhone: '+91-9876543218',
        customerMessage: 'Visited property and completed documentation.',
        status: 'COMPLETED',
        location: 'Jaipur',
        preferredContactTime: 'Evening (6 PM - 8 PM)',
        scheduledAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        partnerId: null,
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        contactedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        metadata: { dealValue: 4500000, commission: 45000 }
      },
      
      // CLOSED leads (not interested/lost)
      {
        listingType: 'PROPERTY',
        listingId: 13,
        reason: 'CALLBACK_REQUEST',
        customerName: 'Meera Iyer',
        customerEmail: 'meera.iyer@email.com',
        customerPhone: '+91-9876543219',
        customerMessage: 'Changed mind. Found another property.',
        status: 'CLOSED',
        location: 'Surat',
        preferredContactTime: 'Afternoon (2 PM - 4 PM)',
        partnerId: null,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        contactedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        metadata: { closeReason: 'Found alternative property' }
      }
    ];
    
    await ListingLead.bulkCreate(property13Leads);
    console.log(`✓ Inserted ${property13Leads.length} leads for Property 13`);
    
    // Leads for other listings
    const otherLeads = [
      // Property 14 leads
      {
        listingType: 'PROPERTY',
        listingId: 14,
        reason: 'CONNECT_AGENT',
        customerName: 'Sanjay Desai',
        customerEmail: 'sanjay.desai@email.com',
        customerPhone: '+91-9876543220',
        customerMessage: 'Looking for 2BHK in this locality.',
        status: 'NEW',
        location: 'Mumbai',
        preferredContactTime: 'Morning (10 AM - 12 PM)',
        partnerId: null,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        listingType: 'PROPERTY',
        listingId: 14,
        reason: 'VIRTUAL_TOUR',
        customerName: 'Neha Kapoor',
        customerEmail: 'neha.kapoor@email.com',
        customerPhone: '+91-9876543221',
        customerMessage: 'Schedule virtual tour for tomorrow.',
        status: 'CONTACTED',
        location: 'Delhi',
        preferredContactTime: 'Evening (7 PM - 9 PM)',
        scheduledAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        partnerId: null,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
        contactedAt: new Date(Date.now() - 18 * 60 * 60 * 1000)
      },
      
      // Property 15 leads
      {
        listingType: 'PROPERTY',
        listingId: 15,
        reason: 'CALLBACK_REQUEST',
        customerName: 'Karthik Nair',
        customerEmail: 'karthik.nair@email.com',
        customerPhone: '+91-9876543222',
        customerMessage: 'Need more photos and pricing details.',
        status: 'NEW',
        location: 'Bangalore',
        preferredContactTime: 'Afternoon (1 PM - 3 PM)',
        partnerId: null,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      
      // PG Hostel leads
      {
        listingType: 'PG_COLIVING',
        listingId: 1,
        reason: 'CONNECT_AGENT',
        customerName: 'Aditya Mishra',
        customerEmail: 'aditya.mishra@email.com',
        customerPhone: '+91-9876543223',
        customerMessage: 'Looking for PG accommodation near IT park.',
        status: 'NEW',
        location: 'Pune',
        preferredContactTime: 'Anytime',
        partnerId: null,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        listingType: 'PG_COLIVING',
        listingId: 1,
        reason: 'VIRTUAL_TOUR',
        customerName: 'Riya Das',
        customerEmail: 'riya.das@email.com',
        customerPhone: '+91-9876543224',
        customerMessage: 'Want to see the rooms and facilities.',
        status: 'CONTACTED',
        location: 'Hyderabad',
        preferredContactTime: 'Morning (11 AM - 1 PM)',
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        partnerId: null,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        contactedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      
      // Project leads
      {
        listingType: 'PROJECT',
        listingId: 1,
        reason: 'CONNECT_AGENT',
        customerName: 'Ankit Agarwal',
        customerEmail: 'ankit.agarwal@email.com',
        customerPhone: '+91-9876543225',
        customerMessage: 'Interested in booking a flat in this project.',
        status: 'IN_PROGRESS',
        location: 'Mumbai',
        preferredContactTime: 'Evening (5 PM - 7 PM)',
        partnerId: null,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        contactedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        listingType: 'PROJECT',
        listingId: 1,
        reason: 'VIRTUAL_TOUR',
        customerName: 'Pooja Bhatia',
        customerEmail: 'pooja.bhatia@email.com',
        customerPhone: '+91-9876543226',
        customerMessage: 'Want to see sample flat and amenities.',
        status: 'COMPLETED',
        location: 'Bangalore',
        preferredContactTime: 'Afternoon (2 PM - 4 PM)',
        scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        partnerId: null,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        contactedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        metadata: { unitBooked: '3BHK-1205', dealValue: 8500000 }
      },
      
      // Developer leads
      {
        listingType: 'DEVELOPER',
        listingId: 1,
        reason: 'CALLBACK_REQUEST',
        customerName: 'Manish Malhotra',
        customerEmail: 'manish.malhotra@email.com',
        customerPhone: '+91-9876543227',
        customerMessage: 'Interested in your upcoming projects.',
        status: 'NEW',
        location: 'Delhi',
        preferredContactTime: 'Morning (10 AM - 12 PM)',
        partnerId: null,
        createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 7 * 60 * 60 * 1000)
      }
    ];
    
    await ListingLead.bulkCreate(otherLeads);
    console.log(`✓ Inserted ${otherLeads.length} leads for other listings`);
    
    // Summary
    console.log('\n=== Summary ===');
    const summary = await ListingLead.findAll({
      attributes: [
        'listingType',
        'listingId',
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('lead_id')), 'leadCount']
      ],
      group: ['listingType', 'listingId', 'status'],
      order: [['listingType', 'ASC'], ['listingId', 'ASC'], ['status', 'ASC']],
      raw: true
    });
    
    console.table(summary);
    
    // Status distribution
    console.log('\n=== Status Distribution ===');
    const statusSummary = await ListingLead.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('lead_id')), 'count']
      ],
      group: ['status'],
      order: [['status', 'ASC']],
      raw: true
    });
    
    console.table(statusSummary);
    
    console.log('\n✓ Listing leads data seeded successfully!');
    console.log(`Total leads created: ${property13Leads.length + otherLeads.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedListingLeads();
