package com.ssafysignal.api.user.entity;

import com.ssafysignal.api.auth.entity.UserAuth;
import com.ssafysignal.api.common.entity.ImageFile;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@DynamicInsert
@DynamicUpdate
@Builder
@Table(name = "user")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_seq")
    private Integer userSeq;
    @Column(name = "name")
    private String name;
    @Column(name = "email", unique = true)
    private String email;
    @Column(name = "password")
    private String password;
    @Column(name = "nickname")
    private String nickname;
    @Column(name = "birth")
    private String birth;
    @Column(name = "phone")
    private String phone;
    @Column(name = "reg_dt")
    private LocalDateTime regDt;
    @Column(name = "heart_cnt")
    private int heartCnt;
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "user_image_file_seq")
    private ImageFile imageFile;

    @Builder
    public User(Integer userSeq, String name, String email, String password, String nickname, String birth, String phone, LocalDateTime regDt, int heartCnt, ImageFile imageFile) {
        this.userSeq = userSeq;
        this.name = name;
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.birth = birth;
        this.phone = phone;
        this.regDt = regDt;
        this.heartCnt = heartCnt;
        this.imageFile = imageFile;
    }
    
    // Security 설정
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserAuth> authorities = new ArrayList<>();
    public List<String> getAuthorities() {
        return authorities.stream()
                .map(UserAuth::getRole)
                .collect(Collectors.toList());
    }
}
