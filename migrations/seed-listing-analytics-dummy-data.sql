-- Seed dummy data for listing_view table (Listing Analytics)
-- This script inserts sample view records for testing analytics features

-- Insert views for Property ID 13 (the one being queried)
-- Recent views (last 7 days)
INSERT INTO listing_view (listing_type, listing_id, view_duration, viewer_id, session_id, ip_address, device_type, country, city, viewed_at, created_at, updated_at)
VALUES
  -- Today's views
  ('property', 13, 45, NULL, 'session_001', '192.168.1.100', 'desktop', 'India', 'Mumbai', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  ('property', 13, 120, NULL, 'session_002', '192.168.1.101', 'mobile', 'India', 'Delhi', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'),
  ('property', 13, 90, NULL, 'session_003', '192.168.1.102', 'tablet', 'India', 'Bangalore', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours'),
  
  -- Yesterday's views
  ('property', 13, 60, NULL, 'session_004', '192.168.1.103', 'desktop', 'India', 'Pune', NOW() - INTERVAL '1 day 3 hours', NOW() - INTERVAL '1 day 3 hours', NOW() - INTERVAL '1 day 3 hours'),
  ('property', 13, 150, NULL, 'session_005', '192.168.1.104', 'mobile', 'India', 'Hyderabad', NOW() - INTERVAL '1 day 6 hours', NOW() - INTERVAL '1 day 6 hours', NOW() - INTERVAL '1 day 6 hours'),
  ('property', 13, 75, NULL, 'session_006', '192.168.1.105', 'desktop', 'India', 'Chennai', NOW() - INTERVAL '1 day 10 hours', NOW() - INTERVAL '1 day 10 hours', NOW() - INTERVAL '1 day 10 hours'),
  
  -- 2 days ago
  ('property', 13, 30, NULL, 'session_007', '192.168.1.106', 'mobile', 'India', 'Kolkata', NOW() - INTERVAL '2 days 4 hours', NOW() - INTERVAL '2 days 4 hours', NOW() - INTERVAL '2 days 4 hours'),
  ('property', 13, 180, NULL, 'session_008', '192.168.1.107', 'desktop', 'India', 'Ahmedabad', NOW() - INTERVAL '2 days 8 hours', NOW() - INTERVAL '2 days 8 hours', NOW() - INTERVAL '2 days 8 hours'),
  
  -- 3 days ago
  ('property', 13, 95, NULL, 'session_009', '192.168.1.108', 'tablet', 'India', 'Jaipur', NOW() - INTERVAL '3 days 2 hours', NOW() - INTERVAL '3 days 2 hours', NOW() - INTERVAL '3 days 2 hours'),
  ('property', 13, 110, NULL, 'session_010', '192.168.1.109', 'mobile', 'India', 'Surat', NOW() - INTERVAL '3 days 7 hours', NOW() - INTERVAL '3 days 7 hours', NOW() - INTERVAL '3 days 7 hours'),
  
  -- 4 days ago
  ('property', 13, 55, NULL, 'session_011', '192.168.1.110', 'desktop', 'India', 'Lucknow', NOW() - INTERVAL '4 days 5 hours', NOW() - INTERVAL '4 days 5 hours', NOW() - INTERVAL '4 days 5 hours'),
  ('property', 13, 140, NULL, 'session_012', '192.168.1.111', 'mobile', 'India', 'Kanpur', NOW() - INTERVAL '4 days 9 hours', NOW() - INTERVAL '4 days 9 hours', NOW() - INTERVAL '4 days 9 hours'),
  
  -- 5 days ago
  ('property', 13, 85, NULL, 'session_013', '192.168.1.112', 'desktop', 'India', 'Nagpur', NOW() - INTERVAL '5 days 3 hours', NOW() - INTERVAL '5 days 3 hours', NOW() - INTERVAL '5 days 3 hours'),
  ('property', 13, 125, NULL, 'session_014', '192.168.1.113', 'tablet', 'India', 'Indore', NOW() - INTERVAL '5 days 11 hours', NOW() - INTERVAL '5 days 11 hours', NOW() - INTERVAL '5 days 11 hours'),
  
  -- 6 days ago
  ('property', 13, 70, NULL, 'session_015', '192.168.1.114', 'mobile', 'India', 'Bhopal', NOW() - INTERVAL '6 days 4 hours', NOW() - INTERVAL '6 days 4 hours', NOW() - INTERVAL '6 days 4 hours'),
  ('property', 13, 160, NULL, 'session_016', '192.168.1.115', 'desktop', 'India', 'Visakhapatnam', NOW() - INTERVAL '6 days 8 hours', NOW() - INTERVAL '6 days 8 hours', NOW() - INTERVAL '6 days 8 hours');

-- Insert views for other properties (for comparative analytics)
INSERT INTO listing_view (listing_type, listing_id, view_duration, viewer_id, session_id, ip_address, device_type, country, city, viewed_at, created_at, updated_at)
VALUES
  -- Property 14
  ('property', 14, 50, NULL, 'session_017', '192.168.1.116', 'mobile', 'India', 'Mumbai', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
  ('property', 14, 100, NULL, 'session_018', '192.168.1.117', 'desktop', 'India', 'Delhi', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  
  -- Property 15
  ('property', 15, 80, NULL, 'session_019', '192.168.1.118', 'tablet', 'India', 'Bangalore', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),
  ('property', 15, 135, NULL, 'session_020', '192.168.1.119', 'mobile', 'India', 'Pune', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

-- Insert views for PG Hostels
INSERT INTO listing_view (listing_type, listing_id, view_duration, viewer_id, session_id, ip_address, device_type, country, city, viewed_at, created_at, updated_at)
VALUES
  ('pg_hostel', 1, 65, NULL, 'session_021', '192.168.1.120', 'mobile', 'India', 'Mumbai', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
  ('pg_hostel', 1, 90, NULL, 'session_022', '192.168.1.121', 'desktop', 'India', 'Delhi', NOW() - INTERVAL '1 day 2 hours', NOW() - INTERVAL '1 day 2 hours', NOW() - INTERVAL '1 day 2 hours'),
  ('pg_hostel', 2, 45, NULL, 'session_023', '192.168.1.122', 'tablet', 'India', 'Bangalore', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours');

-- Insert views for Projects
INSERT INTO listing_view (listing_type, listing_id, view_duration, viewer_id, session_id, ip_address, device_type, country, city, viewed_at, created_at, updated_at)
VALUES
  ('project', 1, 120, NULL, 'session_024', '192.168.1.123', 'desktop', 'India', 'Mumbai', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
  ('project', 1, 180, NULL, 'session_025', '192.168.1.124', 'mobile', 'India', 'Pune', NOW() - INTERVAL '1 day 5 hours', NOW() - INTERVAL '1 day 5 hours', NOW() - INTERVAL '1 day 5 hours'),
  ('project', 2, 95, NULL, 'session_026', '192.168.1.125', 'tablet', 'India', 'Delhi', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

-- Insert views for Developers
INSERT INTO listing_view (listing_type, listing_id, view_duration, viewer_id, session_id, ip_address, device_type, country, city, viewed_at, created_at, updated_at)
VALUES
  ('developer', 1, 75, NULL, 'session_027', '192.168.1.126', 'desktop', 'India', 'Bangalore', NOW() - INTERVAL '7 hours', NOW() - INTERVAL '7 hours', NOW() - INTERVAL '7 hours'),
  ('developer', 1, 110, NULL, 'session_028', '192.168.1.127', 'mobile', 'India', 'Chennai', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

-- Add some older data (30 days ago) for trend analysis
INSERT INTO listing_view (listing_type, listing_id, view_duration, viewer_id, session_id, ip_address, device_type, country, city, viewed_at, created_at, updated_at)
VALUES
  ('property', 13, 60, NULL, 'session_029', '192.168.1.128', 'mobile', 'India', 'Mumbai', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
  ('property', 13, 90, NULL, 'session_030', '192.168.1.129', 'desktop', 'India', 'Delhi', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  ('property', 13, 45, NULL, 'session_031', '192.168.1.130', 'tablet', 'India', 'Bangalore', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  ('property', 13, 120, NULL, 'session_032', '192.168.1.131', 'mobile', 'India', 'Pune', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
  ('property', 13, 75, NULL, 'session_033', '192.168.1.132', 'desktop', 'India', 'Hyderabad', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days');

-- Verify insertion
SELECT 
  listing_type, 
  listing_id, 
  COUNT(*) as view_count,
  AVG(view_duration) as avg_duration
FROM listing_view
GROUP BY listing_type, listing_id
ORDER BY listing_type, listing_id;
