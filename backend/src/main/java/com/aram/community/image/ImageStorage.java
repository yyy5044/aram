package com.aram.community.image;

import java.io.InputStream;
import java.util.Optional;

/** 이미지 파일 저장소. v1은 로컬 폴더, 배포 때 S3 구현을 추가해요. */
public interface ImageStorage {

	void save(String key, InputStream data);

	Optional<InputStream> open(String key);

	/** 없는 파일을 지워도 오류가 나지 않아요. */
	void delete(String key);

}
