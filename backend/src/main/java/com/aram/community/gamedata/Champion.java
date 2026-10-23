package com.aram.community.gamedata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "champions")
public class Champion {

	@Id
	@Column(length = 40)
	private String id;

	@Column(name = "name_ko", nullable = false, length = 40)
	private String nameKo;

	@Column(name = "image_file", nullable = false, length = 80)
	private String imageFile;

	protected Champion() {
	}

	public Champion(String id, String nameKo, String imageFile) {
		this.id = id;
		this.nameKo = nameKo;
		this.imageFile = imageFile;
	}

	public void update(String nameKo, String imageFile) {
		this.nameKo = nameKo;
		this.imageFile = imageFile;
	}

	public String getId() {
		return id;
	}

	public String getNameKo() {
		return nameKo;
	}

	public String getImageFile() {
		return imageFile;
	}

}
