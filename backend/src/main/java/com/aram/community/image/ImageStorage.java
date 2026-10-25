package com.aram.community.image;

import java.io.InputStream;
import java.nio.file.Path;
import java.util.Optional;

/** 이미지 파일 저장소. v1은 로컬 폴더, 배포 때 S3 구현을 추가해요. */
public interface ImageStorage {

	void save(String key, InputStream data);

	Optional<InputStream> open(String key);

	/** 없는 파일을 지워도 오류가 나지 않아요. */
	void delete(String key);

	/** 파일 경로. 영상처럼 일부분씩(Range) 내려줘야 할 때 써요. 없으면 비어 있어요. */
	Optional<Path> path(String key);

}
