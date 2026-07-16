INSERT INTO branches (id, name, location, status) 
VALUES ('branch-1', 'Headquarters', 'Main Office', 'active');

INSERT INTO managers (id, username, password_hash, role, branch_id, status) 
VALUES ('admin-1', 'admin', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'super manager', 'branch-1', 'active');
