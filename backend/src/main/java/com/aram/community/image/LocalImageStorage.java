package com.aram.community.image;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class LocalImageStorage implements ImageStorage {

	private final Path root;

	public LocalImageStorage(@Value("${app.images.dir:data/images}") String dir) {
		this.root = Path.of(dir).toAbsolutePath().normalize();
	}

	@Override
	public void save(String key, InputStream data) {
		Path target = resolve(key);
		try {
			Files.createDirectories(target.getParent());
			Files.copy(data, target, StandardCopyOption.REPLACE_EXISTING);
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	@Override
	public Optional<InputStream> open(String key) {
		try {
			return Optional.of(Files.newInputStream(resolve(key)));
		}
		catch (NoSuchFileException e) {
			return Optional.empty();
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	@Override
	public void delete(String key) {
		try {
			Files.deleteIfExists(resolve(key));
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	@Override
	public Optional<Path> path(String key) {
		Path p = resolve(key);
		return Files.isRegularFile(p) ? Optional.of(p) : Optional.empty();
	}

	private Path resolve(String key) {
		Path p = root.resolve(key).normalize();
		if (!p.startsWith(root)) {
			throw new IllegalArgumentException("Invalid storage key");
		}
		return p;
	}

}
