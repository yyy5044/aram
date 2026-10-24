-- CommunityDragon 자료 버전. 라이엇 패치 번호가 그대로여도 이 값이 바뀌면 증강 자료를 다시 받아요.
-- 비워 두면 다음 확인 때 한 번 다시 받아요.
alter table game_data_state add column current_cdragon_version varchar(120);
